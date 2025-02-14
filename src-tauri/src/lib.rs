use gstreamer as gst;
use gstreamer::prelude::*;
use gstreamer_video::VideoInfo;
use tauri::Emitter;

const UDP_PORT: i32 = 6900;

#[tauri::command]
async fn start_video_stream(window: tauri::Window) -> Result<(), String> {
  gst::init().map_err(|e| e.to_string())?;

  let pipeline_str = format!(
    "udpsrc port={} caps=\"application/x-rtp, payload=96\" ! \
         rtph264depay ! queue max-size-buffers=1 leaky=downstream ! \
         avdec_h264 ! videoconvert ! video/x-raw,format=RGBA ! \
         appsink name=sink emit-signals=true sync=false",
    UDP_PORT
  );

  let pipeline = gst::parse_launch(&pipeline_str).map_err(|e| e.to_string())?;

  let pipeline = pipeline
    .downcast::<gst::Pipeline>()
    .map_err(|_| "Failed to downcast pipeline".to_string())?;

  let appsink = pipeline
    .by_name("sink")
    .unwrap()
    .downcast::<gstreamer_app::AppSink>()
    .unwrap();

  appsink.set_callbacks(
    gstreamer_app::AppSinkCallbacks::builder()
      .new_sample(move |sink| {
        let sample = sink.pull_sample().map_err(|_| gst::FlowError::Error)?;
        let buffer = sample.buffer().ok_or(gst::FlowError::Error)?;
        let map = buffer.map_readable().map_err(|_| gst::FlowError::Error)?;

        // Convert the frame data to base64
        let base64_frame = base64::encode(&map);
        println!("Frame size before encoding: {}", map.len());
        println!("Frame size after encoding: {}", base64_frame.len());

        // Send frame to the frontend
        window
          .emit("video-frame", base64_frame)
          .expect("Failed to emit frame");

        Ok(gst::FlowSuccess::Ok)
      })
      .build(),
  );

  pipeline
    .set_state(gst::State::Playing)
    .map_err(|e| e.to_string())?;

  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![start_video_stream])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
