//! Turns raw YOLO output tensors into boxes in source-frame coordinates.

/// Where the model input sits inside the source frame. The frame is scaled by
/// `scale` and centred with `pad_x`/`pad_y` pixels of padding, the same
/// letterbox Ultralytics uses for training and prediction.
#[derive(Clone, Copy, Debug)]
pub struct Letterbox {
  pub scale: f32,
  pub pad_x: f32,
  pub pad_y: f32,
  pub source_width: u32,
  pub source_height: u32,
}

impl Letterbox {
  pub fn fit(source_width: u32, source_height: u32, input_width: u32, input_height: u32) -> Self {
    let scale =
      (input_width as f32 / source_width as f32).min(input_height as f32 / source_height as f32);
    let scaled_width = (source_width as f32 * scale).round();
    let scaled_height = (source_height as f32 * scale).round();
    Self {
      scale,
      pad_x: ((input_width as f32 - scaled_width) / 2.0).floor(),
      pad_y: ((input_height as f32 - scaled_height) / 2.0).floor(),
      source_width,
      source_height,
    }
  }

  /// Scaled frame size inside the model input.
  #[allow(clippy::cast_sign_loss)] // Sizes and scale are positive.
  pub fn scaled_size(&self) -> (u32, u32) {
    (
      (self.source_width as f32 * self.scale).round() as u32,
      (self.source_height as f32 * self.scale).round() as u32,
    )
  }

  /// Maps corners in model-input pixels to 0..1 source-frame coordinates.
  fn normalize(&self, corners: [f32; 4]) -> [f32; 4] {
    let width = self.source_width as f32;
    let height = self.source_height as f32;
    let x1 = ((corners[0] - self.pad_x) / self.scale / width).clamp(0.0, 1.0);
    let y1 = ((corners[1] - self.pad_y) / self.scale / height).clamp(0.0, 1.0);
    let x2 = ((corners[2] - self.pad_x) / self.scale / width).clamp(0.0, 1.0);
    let y2 = ((corners[3] - self.pad_y) / self.scale / height).clamp(0.0, 1.0);
    [x1, y1, x2, y2]
  }
}

/// How the model lays out its single output tensor.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OutputLayout {
  /// `[1, 4 + classes, anchors]`: centre/size boxes followed by one score per
  /// class, before non-maximum suppression (`YOLOv8` to `YOLO26` default export).
  ChannelsFirst { anchors: usize, classes: usize },
  /// `[1, anchors, 4 + classes]`: the same values, transposed.
  ChannelsLast { anchors: usize, classes: usize },
  /// `[1, detections, 6]`: `x1, y1, x2, y2, score, class` with suppression
  /// already done inside the model (`end2end` exports).
  EndToEnd { detections: usize },
}

impl OutputLayout {
  /// Works out the layout from the output shape. `class_count` comes from the
  /// model metadata when present, and `end_to_end` from its `end2end` flag.
  ///
  /// # Errors
  /// Returns an error when the shape matches no supported YOLO layout.
  pub fn from_shape(
    shape: &[i64],
    class_count: Option<usize>,
    end_to_end: Option<bool>,
  ) -> Result<Self, String> {
    let [batch, rows, columns] = shape else {
      return Err(format!("Expected a 3-dimensional output, got shape {shape:?}"));
    };
    if *batch != 1 && *batch != -1 {
      return Err(format!("Expected a batch size of 1, got shape {shape:?}"));
    }
    let (Ok(rows), Ok(columns)) = (usize::try_from(*rows), usize::try_from(*columns)) else {
      return Err(format!("Output shape {shape:?} has dynamic dimensions"));
    };

    let looks_end_to_end = columns == 6 && rows <= 1000;
    if end_to_end.unwrap_or(looks_end_to_end) {
      if columns != 6 {
        return Err(format!("End-to-end output must have 6 values per box, got {shape:?}"));
      }
      return Ok(Self::EndToEnd { detections: rows });
    }

    let matches_classes = |channels: usize| class_count.is_none_or(|count| channels == count + 4);
    if rows > 4 && rows < columns && matches_classes(rows) {
      return Ok(Self::ChannelsFirst {
        anchors: columns,
        classes: rows - 4,
      });
    }
    if columns > 4 && columns < rows && matches_classes(columns) {
      return Ok(Self::ChannelsLast {
        anchors: rows,
        classes: columns - 4,
      });
    }
    Err(format!("Unsupported output shape {shape:?}"))
  }

  pub fn expected_len(&self) -> usize {
    match *self {
      Self::ChannelsFirst { anchors, classes } | Self::ChannelsLast { anchors, classes } => {
        anchors * (classes + 4)
      },
      Self::EndToEnd { detections } => detections * 6,
    }
  }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RawDetection {
  pub class_id: u32,
  pub confidence: f32,
  /// `x1, y1, x2, y2` in 0..1 source-frame coordinates.
  pub corners: [f32; 4],
}

pub struct DecodeOptions<'a> {
  pub min_confidence: f32,
  pub iou_threshold: f32,
  pub max_detections: usize,
  /// When set, only these class IDs are kept.
  pub classes: Option<&'a [u32]>,
}

/// Decodes one output tensor into boxes, best first.
pub fn decode(
  data: &[f32],
  layout: OutputLayout,
  letterbox: &Letterbox,
  options: &DecodeOptions,
) -> Vec<RawDetection> {
  if data.len() < layout.expected_len() {
    return Vec::new();
  }
  let allowed = |class_id: u32| options.classes.is_none_or(|classes| classes.contains(&class_id));

  match layout {
    OutputLayout::EndToEnd { detections } => {
      let mut found: Vec<RawDetection> = data
        .chunks_exact(6)
        .take(detections)
        .filter_map(|row| {
          let confidence = row[4];
          if !row[5].is_finite() || row[5] < 0.0 || row[5].fract() != 0.0 {
            return None;
          }
          #[allow(clippy::cast_sign_loss)] // Clamped to zero first.
          let class_id = row[5].max(0.0) as u32;
          if confidence < options.min_confidence || !allowed(class_id) {
            return None;
          }
          valid_detection(class_id, confidence, [row[0], row[1], row[2], row[3]], letterbox)
        })
        .collect();
      sort_by_confidence(&mut found);
      found.truncate(options.max_detections);
      found
    },
    OutputLayout::ChannelsFirst { anchors, classes } => {
      let value = |channel: usize, anchor: usize| data[channel * anchors + anchor];
      let candidates = collect_candidates(anchors, classes, value, letterbox, options, allowed);
      suppress(candidates, options)
    },
    OutputLayout::ChannelsLast { anchors, classes } => {
      let stride = classes + 4;
      let value = |channel: usize, anchor: usize| data[anchor * stride + channel];
      let candidates = collect_candidates(anchors, classes, value, letterbox, options, allowed);
      suppress(candidates, options)
    },
  }
}

fn collect_candidates(
  anchors: usize,
  classes: usize,
  value: impl Fn(usize, usize) -> f32,
  letterbox: &Letterbox,
  options: &DecodeOptions,
  allowed: impl Fn(u32) -> bool,
) -> Vec<RawDetection> {
  let mut candidates = Vec::new();
  for anchor in 0..anchors {
    let mut best_class = 0;
    let mut best_score = f32::MIN;
    for class in 0..classes {
      let score = value(4 + class, anchor);
      if score > best_score {
        best_score = score;
        best_class = class;
      }
    }
    let class_id = best_class as u32;
    if best_score < options.min_confidence || !allowed(class_id) {
      continue;
    }
    let (cx, cy) = (value(0, anchor), value(1, anchor));
    let (half_width, half_height) = (value(2, anchor) / 2.0, value(3, anchor) / 2.0);
    if let Some(detection) = valid_detection(
      class_id,
      best_score,
      [
        cx - half_width,
        cy - half_height,
        cx + half_width,
        cy + half_height,
      ],
      letterbox,
    ) {
      candidates.push(detection);
    }
  }
  candidates
}

fn valid_detection(
  class_id: u32,
  confidence: f32,
  corners: [f32; 4],
  letterbox: &Letterbox,
) -> Option<RawDetection> {
  if !confidence.is_finite() || !corners.iter().all(|value| value.is_finite()) {
    return None;
  }
  let corners = letterbox.normalize(corners);
  (corners[2] > corners[0] && corners[3] > corners[1]).then_some(RawDetection {
    class_id,
    confidence,
    corners,
  })
}

/// Upper bound on boxes fed into suppression, which is quadratic.
const MAX_CANDIDATES: usize = 3000;

/// Class-aware non-maximum suppression, like Ultralytics' default.
fn suppress(mut candidates: Vec<RawDetection>, options: &DecodeOptions) -> Vec<RawDetection> {
  sort_by_confidence(&mut candidates);
  candidates.truncate(MAX_CANDIDATES);
  let mut kept: Vec<RawDetection> = Vec::new();
  for candidate in candidates {
    if kept.len() >= options.max_detections {
      break;
    }
    let overlaps = kept.iter().any(|existing| {
      existing.class_id == candidate.class_id
        && iou(&existing.corners, &candidate.corners) > options.iou_threshold
    });
    if !overlaps {
      kept.push(candidate);
    }
  }
  kept
}

fn sort_by_confidence(detections: &mut [RawDetection]) {
  detections.sort_by(|a, b| b.confidence.total_cmp(&a.confidence));
}

pub fn iou(a: &[f32; 4], b: &[f32; 4]) -> f32 {
  let width = (a[2].min(b[2]) - a[0].max(b[0])).max(0.0);
  let height = (a[3].min(b[3]) - a[1].max(b[1])).max(0.0);
  let intersection = width * height;
  let union = area(a) + area(b) - intersection;
  if union <= 0.0 {
    0.0
  } else {
    intersection / union
  }
}

fn area(corners: &[f32; 4]) -> f32 {
  (corners[2] - corners[0]).max(0.0) * (corners[3] - corners[1]).max(0.0)
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]

  use super::*;

  fn options(classes: Option<&[u32]>) -> DecodeOptions<'_> {
    DecodeOptions {
      min_confidence: 0.25,
      iou_threshold: 0.7,
      max_detections: 300,
      classes,
    }
  }

  fn assert_close(actual: f32, expected: f32) {
    assert!((actual - expected).abs() < 1e-4, "{actual} != {expected}");
  }

  #[test]
  fn letterbox_centres_a_wide_frame() {
    let letterbox = Letterbox::fit(1920, 1080, 640, 640);
    assert_close(letterbox.scale, 1.0 / 3.0);
    assert_eq!(letterbox.scaled_size(), (640, 360));
    assert_close(letterbox.pad_x, 0.0);
    assert_close(letterbox.pad_y, 140.0);
    let corners = letterbox.normalize([0.0, 140.0, 640.0, 500.0]);
    for (actual, expected) in corners.iter().zip([0.0, 0.0, 1.0, 1.0]) {
      assert_close(*actual, expected);
    }
  }

  #[test]
  fn detects_layouts_from_shape() {
    assert_eq!(
      OutputLayout::from_shape(&[1, 84, 8400], Some(80), Some(false)),
      Ok(OutputLayout::ChannelsFirst {
        anchors: 8400,
        classes: 80
      })
    );
    assert_eq!(
      OutputLayout::from_shape(&[1, 8400, 84], None, None),
      Ok(OutputLayout::ChannelsLast {
        anchors: 8400,
        classes: 80
      })
    );
    assert_eq!(
      OutputLayout::from_shape(&[1, 300, 6], Some(80), None),
      Ok(OutputLayout::EndToEnd { detections: 300 })
    );
    // Two classes also give six channels; metadata disambiguates.
    assert_eq!(
      OutputLayout::from_shape(&[1, 6, 8400], Some(2), Some(false)),
      Ok(OutputLayout::ChannelsFirst {
        anchors: 8400,
        classes: 2
      })
    );
    assert!(OutputLayout::from_shape(&[1, 85, 8400], Some(80), None).is_err());
    assert!(OutputLayout::from_shape(&[1, 84], None, None).is_err());
  }

  /// Builds a channels-first tensor from `(cx, cy, w, h, class, score)` rows.
  fn channels_first(classes: usize, boxes: &[(f32, f32, f32, f32, usize, f32)]) -> Vec<f32> {
    let anchors = boxes.len();
    let mut data = vec![0.0; (classes + 4) * anchors];
    for (anchor, &(cx, cy, w, h, class, score)) in boxes.iter().enumerate() {
      data[anchor] = cx;
      data[anchors + anchor] = cy;
      data[2 * anchors + anchor] = w;
      data[3 * anchors + anchor] = h;
      data[(4 + class) * anchors + anchor] = score;
    }
    data
  }

  #[test]
  fn suppresses_overlapping_boxes_of_the_same_class_only() {
    let data = channels_first(
      2,
      &[
        (100.0, 100.0, 50.0, 50.0, 0, 0.9),
        (102.0, 101.0, 50.0, 50.0, 0, 0.8),
        (102.0, 101.0, 50.0, 50.0, 1, 0.7),
        (400.0, 400.0, 50.0, 50.0, 0, 0.6),
        (500.0, 500.0, 50.0, 50.0, 0, 0.1),
      ],
    );
    let letterbox = Letterbox::fit(640, 640, 640, 640);
    let layout = OutputLayout::ChannelsFirst {
      anchors: 5,
      classes: 2,
    };
    let found = decode(&data, layout, &letterbox, &options(None));
    let summary: Vec<(u32, f32)> = found.iter().map(|d| (d.class_id, d.confidence)).collect();
    assert_eq!(summary, vec![(0, 0.9), (1, 0.7), (0, 0.6)]);
    let first = found[0].corners;
    for (actual, expected) in first.iter().zip([75.0, 75.0, 125.0, 125.0]) {
      assert_close(*actual, expected / 640.0);
    }

    let only_second_class = decode(&data, layout, &letterbox, &options(Some(&[1])));
    assert_eq!(only_second_class.len(), 1);
    assert_eq!(only_second_class[0].class_id, 1);
  }

  #[test]
  fn decodes_end_to_end_rows() {
    let data = vec![
      10.0, 20.0, 30.0, 40.0, 0.2, 3.0, //
      0.0, 140.0, 320.0, 320.0, 0.8, 1.0, //
    ];
    let letterbox = Letterbox::fit(1920, 1080, 640, 640);
    let found = decode(&data, OutputLayout::EndToEnd { detections: 2 }, &letterbox, &options(None));
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].class_id, 1);
    for (actual, expected) in found[0].corners.iter().zip([0.0, 0.0, 0.5, 0.5]) {
      assert_close(*actual, expected);
    }
  }

  #[test]
  fn ignores_truncated_output() {
    let letterbox = Letterbox::fit(640, 640, 640, 640);
    let layout = OutputLayout::ChannelsFirst {
      anchors: 10,
      classes: 2,
    };
    assert!(decode(&[0.0; 5], layout, &letterbox, &options(None)).is_empty());
  }

  #[test]
  fn rejects_non_finite_and_empty_end_to_end_boxes() {
    let data = [
      10.0,
      20.0,
      30.0,
      40.0,
      f32::NAN,
      0.0,
      f32::INFINITY,
      20.0,
      30.0,
      40.0,
      0.9,
      0.0,
      10.0,
      20.0,
      30.0,
      40.0,
      0.9,
      f32::NAN,
      30.0,
      20.0,
      10.0,
      40.0,
      0.9,
      0.0,
      10.0,
      20.0,
      30.0,
      40.0,
      0.9,
      0.0,
    ];
    let letterbox = Letterbox::fit(640, 640, 640, 640);
    let found = decode(&data, OutputLayout::EndToEnd { detections: 5 }, &letterbox, &options(None));
    assert_eq!(found.len(), 1);
    assert_eq!(found[0].class_id, 0);
  }

  #[test]
  fn channels_last_matches_channels_first_and_empty_filter_hides_all() {
    let boxes = [
      (100.0, 100.0, 50.0, 50.0, 0, 0.9),
      (400.0, 400.0, 50.0, 50.0, 1, 0.8),
    ];
    let first = channels_first(2, &boxes);
    let mut last = Vec::new();
    for anchor in 0..2 {
      for channel in 0..6 {
        last.push(first[channel * 2 + anchor]);
      }
    }
    let letterbox = Letterbox::fit(640, 640, 640, 640);
    let layout = OutputLayout::ChannelsLast {
      anchors: 2,
      classes: 2,
    };
    assert_eq!(
      decode(&last, layout, &letterbox, &options(None)),
      decode(
        &first,
        OutputLayout::ChannelsFirst {
          anchors: 2,
          classes: 2
        },
        &letterbox,
        &options(None)
      )
    );
    assert!(decode(&last, layout, &letterbox, &options(Some(&[]))).is_empty());
  }
}
