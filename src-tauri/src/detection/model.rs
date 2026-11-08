//! Loads an ONNX detection model and runs it on letterboxed RGB frames.

use std::path::Path;
use std::sync::OnceLock;

use ort::environment::Environment;
use ort::session::Session;
use ort::value::{TensorElementType, TensorRef};
use serde::{Deserialize, Serialize};

use super::postprocess::OutputLayout;
use super::providers;

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
  input_name: String,
  layout: OutputLayout,
  description: ModelDescription,
  /// Reused CHW float buffer for the model input.
  input: Vec<f32>,
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
      let session = providers::build_session(environment()?, path, provider)?;
      let mut model = Self::from_session(session)?;
      // Static-output models also need a real run: provider errors often happen
      // only when the first kernel is launched.
      model
        .validate()
        .map_err(|error| format!("{} {error}", providers::requirements(provider)))?;
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
      description,
      session,
    })
  }

  pub fn description(&self) -> &ModelDescription {
    &self.description
  }

  pub fn layout(&self) -> OutputLayout {
    self.layout
  }

  /// # Errors
  /// Returns an error if inference on a padded image fails.
  pub fn validate(&mut self) -> Result<(), String> {
    let output = self.run(&[], 0, 0, 0, 0, 0)?;
    if output.len() != self.layout.expected_len() || output.iter().any(|value| !value.is_finite()) {
      return Err(
        "The model output has an invalid shape or contains non-finite values".to_string(),
      );
    }
    Ok(())
  }

  /// Runs the model on an RGB24 image already scaled to `scaled_width` x
  /// `scaled_height` and returns the raw output tensor.
  ///
  /// # Errors
  /// Returns an error if inference fails or the output is not `f32`.
  pub fn run(
    &mut self,
    rgb: &[u8],
    stride: usize,
    scaled_width: u32,
    scaled_height: u32,
    pad_x: u32,
    pad_y: u32,
  ) -> Result<Vec<f32>, String> {
    let width = self.description.input_width as usize;
    let height = self.description.input_height as usize;
    let plane = width * height;
    let pad = f32::from(PAD_VALUE) / 255.0;
    self.input.fill(pad);

    let (pad_x, pad_y) = (pad_x as usize, pad_y as usize);
    let rows = (scaled_height as usize).min(height.saturating_sub(pad_y));
    let columns = (scaled_width as usize).min(width.saturating_sub(pad_x));
    for row in 0..rows {
      let Some(source) = rgb.get(row * stride..row * stride + columns * 3) else {
        break;
      };
      let offset = (row + pad_y) * width + pad_x;
      for (column, pixel) in source.as_chunks::<3>().0.iter().enumerate() {
        let index = offset + column;
        self.input[index] = f32::from(pixel[0]) / 255.0;
        self.input[plane + index] = f32::from(pixel[1]) / 255.0;
        self.input[2 * plane + index] = f32::from(pixel[2]) / 255.0;
      }
    }

    let tensor = TensorRef::from_array_view(([1_usize, 3, height, width], self.input.as_slice()))
      .map_err(|error| error.to_string())?;
    let outputs = self
      .session
      .run(ort::inputs![self.input_name.as_str() => tensor])
      .map_err(|error| error.to_string())?;
    let (_, data) = outputs[0].try_extract_tensor::<f32>().map_err(|error| error.to_string())?;
    Ok(data.to_vec())
  }
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
