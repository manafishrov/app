//! Native Android and iOS services that desktop builds get from SDL, the
//! system file dialogs and the host network stack: game controllers, file
//! storage through the system pickers, and routing traffic over the ROV
//! ethernet tether.

use std::path::{Path, PathBuf};

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::plugin::{Builder, PluginApi, PluginHandle, TauriPlugin};
use tauri::{Manager, Runtime};

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.manafishrov.mobile";

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_manafish_mobile);

/// Folder the user picked for saving files. `directory` is an opaque token
/// (an Android tree URI or an iOS bookmark) to store and pass back later.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedDirectory {
  pub directory: String,
  pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GamepadVibration {
  pub index: u32,
  pub low_freq: f32,
  pub high_freq: f32,
  pub duration_ms: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GamepadStreamArgs {
  channel: Channel<serde_json::Value>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RovAddressArgs<'a> {
  address: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryArgs<'a> {
  directory: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveToDirectoryArgs<'a> {
  source: &'a Path,
  directory: &'a str,
  file_name: &'a str,
  mime_type: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportFileArgs<'a> {
  source: &'a Path,
  file_name: &'a str,
  mime_type: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportFileArgs<'a> {
  mime_types: &'a [&'a str],
}

#[derive(Deserialize)]
struct PickDirectoryResponse {
  directory: Option<PickedDirectory>,
}

#[derive(Deserialize)]
struct NameResponse {
  name: String,
}

#[derive(Deserialize)]
struct LocationResponse {
  location: String,
}

#[derive(Deserialize)]
struct SavedResponse {
  saved: bool,
}

#[derive(Deserialize)]
struct ImportFileResponse {
  path: Option<PathBuf>,
}

pub struct Mobile<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Mobile<R> {
  async fn run<T: DeserializeOwned>(
    &self,
    command: &str,
    payload: impl Serialize,
  ) -> Result<T, String> {
    self
      .0
      .run_mobile_plugin_async(command, payload)
      .await
      .map_err(|error| error.to_string())
  }

  /// Streams controller snapshots shaped like the desktop SDL
  /// `gamepad_event` payload to `on_event`.
  ///
  /// # Errors
  /// Returns an error if the native controller listener cannot start.
  pub async fn start_gamepad_stream(
    &self,
    on_event: impl Fn(serde_json::Value) + Send + Sync + 'static,
  ) -> Result<(), String> {
    let channel = Channel::new(move |body| {
      if let InvokeResponseBody::Json(json) = body
        && let Ok(value) = serde_json::from_str(&json)
      {
        on_event(value);
      }
      Ok(())
    });
    self
      .run::<serde_json::Value>("startGamepadStream", GamepadStreamArgs { channel })
      .await
      .map(|_| ())
  }

  /// # Errors
  /// Returns an error if the native call fails.
  pub async fn vibrate_gamepad(&self, vibration: GamepadVibration) -> Result<(), String> {
    self.run::<serde_json::Value>("vibrateGamepad", vibration).await.map(|_| ())
  }

  /// Routes the app's traffic over the ethernet network that reaches
  /// `address`, so the ROV is reachable while Wi-Fi stays the system default.
  ///
  /// # Errors
  /// Returns an error if the native call fails.
  pub async fn set_rov_address(&self, address: &str) -> Result<(), String> {
    self
      .run::<serde_json::Value>("setRovAddress", RovAddressArgs { address })
      .await
      .map(|_| ())
  }

  /// Shows the system folder picker. Returns `None` when cancelled.
  ///
  /// # Errors
  /// Returns an error if the picker fails or access cannot be retained.
  pub async fn pick_directory(&self) -> Result<Option<PickedDirectory>, String> {
    self
      .run::<PickDirectoryResponse>("pickDirectory", ())
      .await
      .map(|response| response.directory)
  }

  /// Human-readable name of a stored directory token; an empty token is the
  /// platform default location.
  ///
  /// # Errors
  /// Returns an error if the token can no longer be resolved.
  pub async fn describe_directory(&self, directory: &str) -> Result<String, String> {
    self
      .run::<NameResponse>("describeDirectory", DirectoryArgs { directory })
      .await
      .map(|response| response.name)
  }

  /// Copies `source` into a stored directory (or the platform default when
  /// `directory` is empty) and returns where it was saved.
  ///
  /// # Errors
  /// Returns an error if the destination cannot be written.
  pub async fn save_to_directory(
    &self,
    source: &Path,
    directory: &str,
    file_name: &str,
    mime_type: &str,
  ) -> Result<String, String> {
    self
      .run::<LocationResponse>(
        "saveToDirectory",
        SaveToDirectoryArgs {
          source,
          directory,
          file_name,
          mime_type,
        },
      )
      .await
      .map(|response| response.location)
  }

  /// Lets the user choose where to save a copy of `source`. Returns `false`
  /// when cancelled.
  ///
  /// # Errors
  /// Returns an error if the copy cannot be written.
  pub async fn export_file(
    &self,
    source: &Path,
    file_name: &str,
    mime_type: &str,
  ) -> Result<bool, String> {
    self
      .run::<SavedResponse>(
        "exportFile",
        ExportFileArgs {
          source,
          file_name,
          mime_type,
        },
      )
      .await
      .map(|response| response.saved)
  }

  /// Lets the user pick a file and returns the path of a readable local copy,
  /// or `None` when cancelled.
  ///
  /// # Errors
  /// Returns an error if the picked file cannot be copied.
  pub async fn import_file(&self, mime_types: &[&str]) -> Result<Option<PathBuf>, String> {
    self
      .run::<ImportFileResponse>("importFile", ImportFileArgs { mime_types })
      .await
      .map(|response| response.path)
  }
}

pub trait MobileExt<R: Runtime> {
  fn mobile(&self) -> &Mobile<R>;
}

impl<R: Runtime, T: Manager<R>> MobileExt<R> for T {
  fn mobile(&self) -> &Mobile<R> {
    self.state::<Mobile<R>>().inner()
  }
}

fn register<R: Runtime>(api: &PluginApi<R, ()>) -> Result<PluginHandle<R>, String> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin(PLUGIN_IDENTIFIER, "MobilePlugin");
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_manafish_mobile);
  handle.map_err(|error| error.to_string())
}

#[must_use]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("manafish-mobile")
    .setup(|app, api| {
      app.manage(Mobile(register(&api)?));
      Ok(())
    })
    .build()
}
