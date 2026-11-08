//! Loads an ONNX detection model and runs it on letterboxed RGB frames.

use std::path::Path;
use std::sync::OnceLock;

use ort::environment::Environment;
use ort::session::Session;
use ort::value::{TensorElementType, TensorRef};
use serde::{Deserialize, Serialize};

use super::diagnostics::ModelTimings;
use super::postprocess::OutputLayout;
use super::providers;
use std::time::Instant;

/// Grey used by Ultralytics to pad letterboxed images.
const PAD_VALUE: u8 = 114;
const DEFAULT_INPUT_SIZE: u32 = 640;

pub use crate::models::config::ExecutionProviderPreference;

/// The backend a session actually runs on.
#[allow(dead_code, reason = "Each platform only builds its own GPU backend")]
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ExecutionProvider {
  Cpu,
  CoreMl,
  Nnapi,
  DirectMl,
  Cuda,
  Migraphx,
  OpenVino,
}

/// Preferences compiled into this build; runtime and model support are checked on load.
pub fn supported_preferences() -> Vec<ExecutionProviderPreference> {
  providers::supported_preferences()
}

/// What the app needs to know about a model, read from its ONNX metadata and
/// input/output shapes.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModelDescription {
  pub classes: Vec<String>,
  pub input_width: u32,
  pub input_height: u32,
  pub description: Option<String>,
  pub author: Option<String>,
  pub license: Option<String>,
}

pub struct DetectionModel {
  session: Session,
  cache: Option<super::cache::CacheEntry>,
  input_name: String,
  layout: OutputLayout,
  description: ModelDescription,
  /// Reused CHW float buffer for the model input.
  input: Vec<f32>,
  timings: ModelTimings,
}

/// # Errors
/// Returns an error if ONNX Runtime fails to initialise.
pub(super) fn environment() -> Result<&'static Environment, String> {
  static ENVIRONMENT: OnceLock<Result<Environment, String>> = OnceLock::new();
  ENVIRONMENT
    .get_or_init(|| {
      providers::init()?
        .with_name("manafish-detection")
        .with_telemetry(false)
        .build()
        .map_err(|error| format!("Failed to start ONNX Runtime: {error}"))
    })
    .as_ref()
    .map_err(Clone::clone)
}

impl DetectionModel {
  /// Loads `path` on the requested backend, falling back to the CPU when the
  /// preference is `Auto` and the GPU backend does not load.
  ///
  /// # Errors
  /// Returns an error if the file is not a supported YOLO detection model or
  /// the requested backend cannot load it.
  pub fn load(
    path: &Path,
    preference: ExecutionProviderPreference,
  ) -> Result<(Self, ExecutionProvider), String> {
    providers::select(preference, |provider| {
      let environment = environment()?;
      #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
      if provider == ExecutionProvider::OpenVino {
        providers::openvino_device(environment)
          .map_err(|error| format!("{} {error}", providers::requirements(provider)))?;
      }
      let cache = super::cache::prepare(path, provider);
      let load = |cache: Option<&super::cache::CacheEntry>| {
        let session = providers::build_session(
          environment,
          path,
          provider,
          cache.map(super::cache::CacheEntry::path),
        )?;
        let mut model = Self::from_session(session)?;
        model
          .validate()
          .map_err(|error| format!("{} {error}", providers::requirements(provider)))?;
        Ok(model)
      };
      let mut model = match load(cache.as_ref()) {
        Ok(model) => model,
        Err(_) if cache.is_some() => {
          if let Some(cache) = &cache {
            cache.invalidate();
          }
          load(None)?
        },
        Err(error) => return Err(error),
      };
      model.cache = cache;

      Ok(model)
    })
  }

  /// # Errors
  /// Returns an error if the model is not a supported YOLO detection model.
  fn from_session(mut session: Session) -> Result<Self, String> {
    let metadata = session.metadata().map_err(|error| error.to_string())?;
    let custom = |key: &str| metadata.custom(key).filter(|value| !value.is_empty());

    if let Some(task) = custom("task")
      && task != "detect"
    {
      return Err(format!("Only detection models are supported, this model's task is \"{task}\""));
    }

    let [input] = session.inputs() else {
      return Err(format!("Expected one model input, found {}", session.inputs().len()));
    };
    let input_shape: Vec<i64> =
      input.dtype().tensor_shape().map(|shape| shape.to_vec()).unwrap_or_default();
    if input.dtype().tensor_type() != Some(TensorElementType::Float32)
      || input_shape.len() != 4
      || !matches!(input_shape[0], 1 | -1)
      || !matches!(input_shape[1], 3 | -1)
    {
      return Err(format!("Expected an RGB image input, got shape {input_shape:?}"));
    }
    let image_size = custom("imgsz").and_then(|value| parse_image_size(&value));
    let dimension = |index: usize, fallback: Option<u32>| {
      u32::try_from(input_shape[index])
        .ok()
        .filter(|size| *size > 0)
        .or(fallback)
        .unwrap_or(DEFAULT_INPUT_SIZE)
    };
    let input_height = dimension(2, image_size.map(|(height, _)| height));
    let input_width = dimension(3, image_size.map(|(_, width)| width));

    // Bound allocations from imported dimensions before creating input tensors.
    if input_width > 2048 || input_height > 2048 {
      return Err("Model input dimensions must not exceed 2048 pixels".to_string());
    }
    #[cfg(mobile)]
    if input_width > 1024 || input_height > 1024 {
      return Err("Mobile model input dimensions must not exceed 1024 pixels".to_string());
    }
    let [output] = session.outputs() else {
      return Err(format!(
        "Expected one model output, found {}. Segmentation and pose models are not supported",
        session.outputs().len()
      ));
    };
    let mut output_shape: Vec<i64> =
      output.dtype().tensor_shape().map(|shape| shape.to_vec()).unwrap_or_default();
    let names = custom("names").map(|value| parse_class_names(&value)).unwrap_or_default();
    let end_to_end = custom("end2end").map(|value| value.eq_ignore_ascii_case("true"));
    let input_name = input.name().to_string();
    let description = custom("description");
    let author = custom("author");
    let license = custom("license");
    drop(metadata);

    // Official downloads use dynamic output axes even when our chosen input
    // size is fixed. Read the real dimensions instead of guessing anchor counts.
    if output_shape.iter().any(|dimension| *dimension <= 0) {
      let padded =
        vec![f32::from(PAD_VALUE) / 255.0; 3 * input_width as usize * input_height as usize];
      let tensor = TensorRef::from_array_view((
        [1_usize, 3, input_height as usize, input_width as usize],
        padded.as_slice(),
      ))
      .map_err(|error| error.to_string())?;
      let outputs = session
        .run(ort::inputs![input_name.as_str() => tensor])
        .map_err(|error| error.to_string())?;
      let (shape, _) = outputs[0].try_extract_tensor::<f32>().map_err(|error| error.to_string())?;
      output_shape = shape.to_vec();
    }
    let class_count = (!names.is_empty()).then_some(names.len());
    let layout = OutputLayout::from_shape(&output_shape, class_count, end_to_end)?;

    let classes = if names.is_empty() {
      let count = match layout {
        OutputLayout::ChannelsFirst { classes, .. }
        | OutputLayout::ChannelsLast { classes, .. } => classes,
        // End-to-end outputs do not reveal the class count.
        OutputLayout::EndToEnd { .. } => 0,
      };
      (0..count).map(|index| format!("Class {index}")).collect()
    } else {
      names
    };

    let description = ModelDescription {
      classes,
      input_width,
      input_height,
      description,
      author,
      license,
    };

    Ok(Self {
      input_name,
      layout,
      input: vec![0.0; 3 * input_width as usize * input_height as usize],
      timings: ModelTimings::default(),
      description,
      session,
      cache: None,
    })
  }

  pub fn description(&self) -> &ModelDescription {
    &self.description
  }

  pub fn timings(&self) -> ModelTimings {
    self.timings
  }

  pub fn layout(&self) -> OutputLayout {
    self.layout
  }

  /// # Errors
  /// Returns an error if inference on a padded image fails.
  pub fn validate(&mut self) -> Result<(), String> {
    let valid =
      self.run_with(&[], 0, 0, 0, 0, 0, |output| output.iter().all(|value| value.is_finite()))?;
    if !valid {
      return Err(
        "The model output has an invalid shape or contains non-finite values".to_string(),
      );
    }
    Ok(())
  }

  /// Runs RGB24 input and consumes the borrowed ORT output before releasing it.
  /// # Errors
  /// Rejects invalid shapes/strides, inference errors and non-f32 output.
  #[allow(clippy::too_many_arguments)]
  pub fn run_with<T>(
    &mut self,
    rgb: &[u8],
    stride: usize,
    scaled_width: u32,
    scaled_height: u32,
    pad_x: u32,
    pad_y: u32,
    consume: impl FnOnce(&[f32]) -> T,
  ) -> Result<T, String> {
    let started = Instant::now();
    prepare_input(
      &mut self.input,
      (self.description.input_width, self.description.input_height),
      rgb,
      stride,
      (scaled_width, scaled_height),
      (pad_x, pad_y),
      3,
    )?;
    self.timings.preprocessing = started.elapsed();
    self.infer_with(consume)
  }

  /// Canvas already letterboxed this tightly packed RGBA image. Alpha is ignored.
  /// # Errors
  /// Rejects malformed input and inference errors.
  #[cfg(any(mobile, test))]
  pub fn run_rgba_with<T>(
    &mut self,
    rgba: &[u8],
    consume: impl FnOnce(&[f32]) -> T,
  ) -> Result<T, String> {
    let (width, height) = (self.description.input_width, self.description.input_height);
    let started = Instant::now();
    prepare_input(
      &mut self.input,
      (width, height),
      rgba,
      width as usize * 4,
      (width, height),
      (0, 0),
      4,
    )?;
    self.timings.preprocessing = started.elapsed();
    self.infer_with(consume)
  }

  /// # Errors
  /// Returns ORT execution, shape or element type errors.
  fn infer_with<T>(&mut self, consume: impl FnOnce(&[f32]) -> T) -> Result<T, String> {
    let width = self.description.input_width as usize;
    let height = self.description.input_height as usize;
    let tensor = TensorRef::from_array_view(([1_usize, 3, height, width], self.input.as_slice()))
      .map_err(|error| error.to_string())?;
    let started = Instant::now();
    let outputs = self
      .session
      .run(ort::inputs![self.input_name.as_str() => tensor])
      .map_err(|error| error.to_string())?;
    self.timings.inference = started.elapsed();
    let (_, data) = outputs[0].try_extract_tensor::<f32>().map_err(|error| error.to_string())?;
    if data.len() != self.layout.expected_len() {
      return Err("The model output changed shape".into());
    }
    let started = Instant::now();
    let result = consume(data);
    self.timings.decode = started.elapsed();
    Ok(result)
  }

  /// # Errors
  /// Returns invalid input or ORT execution errors.
  // Owned output is useful for test comparisons. The live workers borrow it.
  #[cfg(test)]
  pub fn run(
    &mut self,
    rgb: &[u8],
    stride: usize,
    width: u32,
    height: u32,
    x: u32,
    y: u32,
  ) -> Result<Vec<f32>, String> {
    self.run_with(rgb, stride, width, height, x, y, <[f32]>::to_vec)
  }
}

/// Converts RGB/RGBA directly into the reused planar input. Validate the whole
/// image before writing, including FFmpeg row strides and model padding.
#[allow(clippy::too_many_arguments)]
/// # Errors
/// Rejects incomplete pixels and inconsistent shapes, strides or padding.
fn prepare_input(
  input: &mut [f32],
  (width, height): (u32, u32),
  pixels: &[u8],
  stride: usize,
  (columns, rows): (u32, u32),
  (pad_x, pad_y): (u32, u32),
  channels: usize,
) -> Result<(), String> {
  let (width, height, columns, rows, pad_x, pad_y) = (
    width as usize, height as usize, columns as usize, rows as usize, pad_x as usize,
    pad_y as usize,
  );
  let row_bytes = columns.checked_mul(channels).ok_or("Invalid image stride")?;
  let required = rows
    .saturating_sub(1)
    .checked_mul(stride)
    .and_then(|n| n.checked_add(row_bytes))
    .ok_or("Invalid image stride")?;
  if !matches!(channels, 3 | 4)
    || pad_x > width
    || pad_y > height
    || columns > width - pad_x
    || rows > height - pad_y
    || stride < row_bytes
    || (rows > 0 && pixels.len() < required)
    || input.len() != 3 * width * height
  {
    return Err("Invalid detection image dimensions, padding or stride".into());
  }
  let plane = width * height;
  // Fully covered mobile input needs no redundant grey fill.
  if columns != width || rows != height {
    input.fill(f32::from(PAD_VALUE) / 255.0);
  }
  for row in 0..rows {
    let source = &pixels[row * stride..row * stride + row_bytes];
    let offset = (row + pad_y) * width + pad_x;
    for (column, pixel) in source.chunks_exact(channels).enumerate() {
      let index = offset + column;
      input[index] = f32::from(pixel[0]) / 255.0;
      input[plane + index] = f32::from(pixel[1]) / 255.0;
      input[2 * plane + index] = f32::from(pixel[2]) / 255.0;
    }
  }
  Ok(())
}

/// Parses Ultralytics' `names` metadata, a Python dict literal such as
/// `{0: 'person', 1: "fisher's boat"}`, into names ordered by class ID.
pub fn parse_class_names(raw: &str) -> Vec<String> {
  let mut entries: Vec<(usize, String)> = Vec::new();
  let mut chars = raw.chars().peekable();
  loop {
    while chars.next_if(|c| !c.is_ascii_digit()).is_some() {}
    let mut digits = String::new();
    while let Some(digit) = chars.next_if(char::is_ascii_digit) {
      digits.push(digit);
    }
    let Ok(index) = digits.parse::<usize>() else {
      break;
    };
    while chars.next_if(|c| *c != '\'' && *c != '"').is_some() {}
    let Some(quote) = chars.next() else {
      break;
    };
    let mut name = String::new();
    while let Some(c) = chars.next() {
      match c {
        '\\' => {
          if let Some(escaped) = chars.next() {
            name.push(escaped);
          }
        },
        c if c == quote => break,
        c => name.push(c),
      }
    }
    entries.push((index, name));
  }
  entries.sort_by_key(|(index, _)| *index);
  let contiguous = entries.iter().enumerate().all(|(position, (index, _))| position == *index);
  if !contiguous {
    return Vec::new();
  }
  entries.into_iter().map(|(_, name)| name).collect()
}

/// Parses `imgsz` metadata such as `[640, 640]` into `(height, width)`.
fn parse_image_size(raw: &str) -> Option<(u32, u32)> {
  let values: Vec<u32> = raw
    .trim_matches(|c| c == '[' || c == ']' || c == '(' || c == ')')
    .split(',')
    .filter_map(|part| part.trim().parse().ok())
    .collect();
  match values.as_slice() {
    [size] => Some((*size, *size)),
    [height, width] => Some((*height, *width)),
    _ => None,
  }
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]

  use super::*;

  #[test]
  fn rgba_matches_strided_rgb_and_padding_without_an_intermediate_buffer() -> Result<(), String> {
    let mut rgb = vec![0.0; 12];
    let mut rgba = vec![0.0; 12];
    prepare_input(&mut rgb, (2, 2), &[255, 0, 10, 99, 99, 0, 128, 40], 5, (1, 2), (1, 0), 3)?;
    prepare_input(&mut rgba, (2, 2), &[255, 0, 10, 0, 0, 128, 40, 255], 4, (1, 2), (1, 0), 4)?;
    assert_eq!(rgb, rgba);
    assert_eq!(rgb[1], 1.0);
    assert_eq!(rgb[7], 128.0 / 255.0);
    assert_eq!(rgb[9], 10.0 / 255.0);
    assert_eq!(rgb[0], 114.0 / 255.0);
    let before = rgba.clone();
    for (stride, size, pad, pixels) in [
      (3, (1, 2), (0, 0), vec![0; 8]),
      (4, (1, 2), (2, 0), vec![0; 8]),
      (4, (1, 2), (0, 0), vec![0; 7]),
    ] {
      assert!(prepare_input(&mut rgba, (2, 2), &pixels, stride, size, pad, 4).is_err());
      assert_eq!(rgba, before);
    }
    Ok(())
  }

  #[test]
  #[ignore = "Opt-in release microbenchmark; no model/runtime required"]
  fn benchmark_mobile_input_copies() -> Result<(), String> {
    use std::hint::black_box;
    let rgba: Vec<u8> = (0_usize..640 * 640)
      .flat_map(|index| [index as u8, (index / 3) as u8, (index / 7) as u8, 255])
      .collect();
    let mut input = vec![0.0; 3 * 640 * 640];
    let mut samples = [Vec::new(), Vec::new()];
    for _ in 0..200 {
      let started = Instant::now();
      // Previous mobile path: parse copied RGBA, frame.rgb allocated RGB24,
      // then run converted it to the persistent planar input after a grey fill.
      let copied = black_box(rgba.clone());
      let rgb: Vec<u8> = copied
        .as_chunks::<4>()
        .0
        .iter()
        .flat_map(|pixel| pixel[..3].iter().copied())
        .collect();
      input.fill(114.0 / 255.0);
      prepare_input(&mut input, (640, 640), &rgb, 640 * 3, (640, 640), (0, 0), 3)?;
      black_box(&input);
      samples[0].push(started.elapsed().as_secs_f64() * 1000.0);
      let started = Instant::now();
      // Tauri borrows the raw request body: the new worker still needs one
      // owned copy, just like the old parser. Include it on both sides.
      let owned = black_box(rgba.clone());
      prepare_input(&mut input, (640, 640), &owned, 640 * 4, (640, 640), (0, 0), 4)?;
      black_box(&input);
      samples[1].push(started.elapsed().as_secs_f64() * 1000.0);
    }
    for (method, samples) in ["previous_owned_copy_then_rgb", "owned_copy_direct_rgba"]
      .into_iter()
      .zip(&mut samples)
    {
      samples.sort_by(f64::total_cmp);
      eprintln!(
        "INPUT_BENCHMARK {}",
        serde_json::json!({"method":method,"iterations":samples.len(),"p50_ms":samples[100],"p95_ms":samples[190],"profile":if cfg!(debug_assertions){"debug"}else{"release"}})
      );
    }
    Ok(())
  }

  #[test]
  #[ignore = "Opt-in release output-copy microbenchmark; no model/runtime required"]
  fn benchmark_output_copy() {
    use std::hint::black_box;
    let output = vec![0.5_f32; 84 * 8400];
    let mut samples = [Vec::new(), Vec::new()];
    for _ in 0..200 {
      let started = Instant::now();
      black_box(black_box(output.as_slice()).to_vec());
      samples[0].push(started.elapsed().as_secs_f64() * 1000.0);
      let started = Instant::now();
      black_box(black_box(output.as_slice()));
      samples[1].push(started.elapsed().as_secs_f64() * 1000.0);
    }
    for (method, samples) in ["owned_output_copy", "borrowed_output"].into_iter().zip(&mut samples)
    {
      samples.sort_by(f64::total_cmp);
      eprintln!(
        "OUTPUT_BENCHMARK {}",
        serde_json::json!({"method":method,"bytes":output.len()*4,"p50_ms":samples[100],"p95_ms":samples[190]})
      );
    }
  }

  #[test]
  fn parses_python_dict_class_names() {
    assert_eq!(
      parse_class_names(r#"{0: 'person', 1: "fisher's boat", 2: 'tab\'s'}"#),
      vec!["person", "fisher's boat", "tab's"]
    );
    assert_eq!(parse_class_names("{}"), Vec::<String>::new());
    // A gap in the IDs means the mapping cannot be trusted.
    assert_eq!(parse_class_names("{0: 'a', 2: 'c'}"), Vec::<String>::new());
  }

  #[test]
  fn parses_image_size() {
    assert_eq!(parse_image_size("[640, 640]"), Some((640, 640)));
    assert_eq!(parse_image_size("[384, 640]"), Some((384, 640)));
    assert_eq!(parse_image_size("320"), Some((320, 320)));
    assert_eq!(parse_image_size("nonsense"), None);
  }
}
