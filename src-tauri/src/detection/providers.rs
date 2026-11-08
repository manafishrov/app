//! Provider selection and the Linux runtime shared by all vendor backends.

use std::path::Path;

use ort::environment::{Environment, EnvironmentBuilder};
use ort::ep;
use ort::session::Session;
use ort::session::builder::GraphOptimizationLevel;

use super::model::{ExecutionProvider, ExecutionProviderPreference};

pub fn supported_preferences() -> Vec<ExecutionProviderPreference> {
  use ExecutionProviderPreference as P;
  let mut preferences = vec![P::Auto];
  if !gpu_providers().is_empty() {
    preferences.push(P::Gpu);
  }
  #[cfg(target_os = "linux")]
  preferences.push(P::Cuda);
  #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
  preferences.extend([P::Migraphx, P::OpenVino]);
  preferences.push(P::Cpu);
  preferences
}

fn gpu_providers() -> Vec<ExecutionProvider> {
  #[cfg(target_os = "linux")]
  {
    #[cfg(target_arch = "x86_64")]
    {
      vec![
        ExecutionProvider::Cuda,
        ExecutionProvider::Migraphx,
        ExecutionProvider::OpenVino,
      ]
    }
    #[cfg(not(target_arch = "x86_64"))]
    {
      vec![ExecutionProvider::Cuda]
    }
  }
  #[cfg(any(target_os = "macos", target_os = "ios"))]
  {
    vec![ExecutionProvider::CoreMl]
  }
  #[cfg(target_os = "windows")]
  {
    vec![ExecutionProvider::DirectMl]
  }
  #[cfg(target_os = "android")]
  {
    vec![ExecutionProvider::Nnapi]
  }
  #[cfg(not(any(
    target_os = "linux",
    target_os = "macos",
    target_os = "windows",
    target_os = "android",
    target_os = "ios"
  )))]
  {
    Vec::new()
  }
}

/// # Errors
/// Returns all attempted backend errors when the requested preference cannot start.
pub fn select<T>(
  preference: ExecutionProviderPreference,
  mut load: impl FnMut(ExecutionProvider) -> Result<T, String>,
) -> Result<(T, ExecutionProvider), String> {
  use ExecutionProviderPreference as P;
  if !supported_preferences().contains(&preference) {
    return Err(format!("{preference:?} is not supported by this build"));
  }
  let candidates = match preference {
    P::Cpu => vec![ExecutionProvider::Cpu],
    P::Cuda => vec![ExecutionProvider::Cuda],
    P::Migraphx => vec![ExecutionProvider::Migraphx],
    P::OpenVino => vec![ExecutionProvider::OpenVino],
    P::Auto | P::Gpu => gpu_providers(),
  };
  let mut errors = Vec::new();
  for provider in candidates {
    match load(provider) {
      Ok(model) => return Ok((model, provider)),
      Err(error) => errors.push(format!("{provider:?}: {error}")),
    }
  }
  if preference == P::Auto {
    if !errors.is_empty() {
      crate::log_warn!("Detection GPU backends unavailable; using CPU. {}", errors.join("; "));
    }
    return load(ExecutionProvider::Cpu).map(|model| (model, ExecutionProvider::Cpu));
  }
  Err(format!(
    "Could not start detection on the requested backend. {}",
    errors.join("; ")
  ))
}

/// # Errors
/// Returns an error if the bundled runtime cannot be found or loaded.
#[cfg_attr(not(target_os = "linux"), allow(clippy::unnecessary_wraps))]
pub fn init() -> Result<EnvironmentBuilder, String> {
  #[cfg(target_os = "linux")]
  {
    let runtime = runtime_path()?;
    ort::init_from(&runtime).map_err(|error| format!("Cannot load {}: {error}", runtime.display()))
  }
  #[cfg(not(target_os = "linux"))]
  {
    Ok(ort::init())
  }
}

/// # Errors
/// Returns an error when the packaged core is missing.
#[cfg(target_os = "linux")]
fn runtime_path() -> Result<std::path::PathBuf, String> {
  let executable = std::env::current_exe().map_err(|error| error.to_string())?;
  let directory = executable.parent().ok_or("Cannot locate the detection runtime")?;
  let mut candidates = vec![
    directory.join("detection-runtime/libonnxruntime.so"),
    directory.join("../lib/Manafish/detection-runtime/libonnxruntime.so"),
  ];
  if cfg!(any(debug_assertions, test)) {
    candidates
      .push(Path::new(env!("CARGO_MANIFEST_DIR")).join("detection-runtime/libonnxruntime.so"));
  }
  let runtime = candidates.into_iter().find(|path| path.is_file()).ok_or(
    "The bundled ONNX Runtime is missing. For development, run python3 scripts/prepare-linux-detection.py; for installed apps, reinstall Manafish.",
  )?;
  Ok(runtime)
}

/// # Errors
/// Returns an error if the plugin/runtime is missing or no Intel GPU is discovered.
#[cfg(all(target_os = "linux", target_arch = "x86_64"))]
pub(super) fn openvino_device(environment: &Environment) -> ort::Result<ort::device::Device<'_>> {
  use std::sync::OnceLock;
  static REGISTERED: OnceLock<Result<(), String>> = OnceLock::new();
  REGISTERED
    .get_or_init(|| {
      let path = runtime_path()?.with_file_name("libonnxruntime_providers_openvino.so");
      environment
        .register_ep_library("OpenVINO", path)
        .map_err(|error| error.to_string())
    })
    .as_ref()
    .map_err(|error| ort::Error::new(error.clone()))?;
  environment
    .devices()
    .find(|device| {
      device.ep().is_ok_and(|name| name == "OpenVINOExecutionProvider")
        && device.hardware_device().ty() == ort::memory::DeviceType::GPU
    })
    .ok_or_else(|| {
      ort::Error::new(
        "OpenVINO did not discover an Intel GPU. CPU and NPU devices are not selected.",
      )
    })
}

/// # Errors
/// Returns an error if the model/provider cannot load or accepts no GPU nodes.
pub fn build_session(
  environment: &Environment,
  path: &Path,
  provider: ExecutionProvider,
  cache: Option<&Path>,
) -> Result<Session, String> {
  let _ = cache; // Some platforms have no supported provider compilation cache.
  let build = || -> ort::Result<Session> {
    let builder = Session::builder(environment)?
      .with_optimization_level(GraphOptimizationLevel::Level3)?
      .with_config_entry("session.record_ep_graph_assignment_info", "1")?;
    #[cfg(mobile)]
    let builder = builder.with_intra_threads(2)?.with_inter_threads(1)?;
    #[cfg(target_os = "windows")]
    let builder = builder.with_memory_pattern(false)?.with_parallel_execution(false)?;
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    if provider == ExecutionProvider::OpenVino {
      // The CUDA core does not compile in the legacy OpenVINO registration.
      // Load the same-version plugin and select an actual GPU device explicitly.
      let device = openvino_device(environment)?;
      let mut config = serde_json::json!({ "GPU": { "INFERENCE_PRECISION_HINT": "f32" } });
      if let Some(cache) = cache {
        config["GPU"]["CACHE_DIR"] =
          serde_json::Value::String(cache.to_string_lossy().into_owned());
      }
      return builder
        .with_devices(
          [device],
          Some(&[("OpenVINOExecutionProvider.load_config".to_string(), config.to_string())]),
        )?
        .commit_from_file(path);
    }
    let dispatch = match provider {
      ExecutionProvider::Cpu => ep::CPU::default().build(),
      #[cfg(target_os = "macos")]
      ExecutionProvider::CoreMl => {
        let provider = ep::CoreML::default();
        cache
          .map_or(provider.clone(), |path| provider.with_model_cache_dir(path.to_string_lossy()))
          .build()
      },
      #[cfg(target_os = "ios")]
      ExecutionProvider::CoreMl => {
        let provider = ep::CoreML::default().with_model_format(ep::coreml::ModelFormat::MLProgram);
        cache
          .map_or(provider.clone(), |path| provider.with_model_cache_dir(path.to_string_lossy()))
          .build()
      },
      #[cfg(target_os = "android")]
      ExecutionProvider::Nnapi => ep::NNAPI::default().with_disable_cpu(true).build(),
      #[cfg(target_os = "windows")]
      ExecutionProvider::DirectMl => ep::DirectML::default().build(),
      #[cfg(target_os = "linux")]
      ExecutionProvider::Cuda => ep::CUDA::default()
        .with_tf32(false)
        .with_conv_algorithm_search(ep::cuda::ConvAlgorithmSearch::Heuristic)
        .build(),
      #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
      ExecutionProvider::Migraphx => ep::MIGraphX::default().build(),
      #[allow(unreachable_patterns)]
      _ => return Err(ort::Error::new("Backend is not compiled for this platform")),
    };
    builder
      .with_execution_providers([dispatch.error_on_failure()])?
      .commit_from_file(path)
  };
  let session = build().map_err(|error| format!("{} {error}", requirements(provider)))?;
  if provider != ExecutionProvider::Cpu {
    verify_assignment(&session, provider)?;
  }
  Ok(session)
}

pub(super) fn requirements(provider: ExecutionProvider) -> &'static str {
  match provider {
    ExecutionProvider::Cuda => {
      "CUDA requires a supported NVIDIA GPU, driver, CUDA 13 and cuDNN 9 runtime libraries."
    },
    ExecutionProvider::Migraphx => {
      "MIGraphX requires a ROCm-supported AMD GPU, ROCm 7 (libamdhip64.so.7) and MIGraphX 3 (libmigraphx_c.so.3)."
    },
    ExecutionProvider::OpenVino => {
      "OpenVINO requires a supported Intel GPU, Intel compute drivers and OpenVINO 2026.4.1 (libopenvino.so.2641). CPU/AUTO devices are not used."
    },
    ExecutionProvider::Nnapi => {
      "NNAPI requires a compatible Android GPU/NPU driver and supported model operators. NNAPI CPU devices are disabled."
    },
    ExecutionProvider::CoreMl => {
      "Core ML requires a compatible Apple device and supported model operators."
    },
    _ => "The model or execution provider could not load.",
  }
}

/// A registered provider can accept no nodes and leave the whole graph on CPU.
/// Check the actual assignment before reporting GPU. CPU shape/control nodes
/// are allowed alongside real GPU computation.
///
/// # Errors
/// Returns an error if assignment information is unavailable or has no GPU nodes.
fn verify_assignment(session: &Session, provider: ExecutionProvider) -> Result<(), String> {
  use ort::AsPointer;
  use std::ffi::CStr;
  use std::ptr;

  let expected = match provider {
    ExecutionProvider::Cpu => return Ok(()),
    ExecutionProvider::Cuda => "CUDAExecutionProvider",
    ExecutionProvider::Migraphx => "MIGraphXExecutionProvider",
    ExecutionProvider::OpenVino => "OpenVINOExecutionProvider",
    ExecutionProvider::CoreMl => "CoreMLExecutionProvider",
    ExecutionProvider::Nnapi => "NnapiExecutionProvider",
    ExecutionProvider::DirectMl => "DmlExecutionProvider",
  };
  let mut subgraphs = ptr::null();
  let mut count = 0;
  // SAFETY: The session owns all returned assignment data. Every pointer is read
  // only after a successful API call and while the session remains alive.
  unsafe {
    let api = ort::api();
    ort::Error::result_from_status((api.Session_GetEpGraphAssignmentInfo)(
      session.ptr(),
      &raw mut subgraphs,
      &raw mut count,
    ))
    .map_err(|error| error.to_string())?;
    if count > 0 {
      for &subgraph in std::slice::from_raw_parts(subgraphs, count) {
        let mut name = ptr::null();
        ort::Error::result_from_status((api.EpAssignedSubgraph_GetEpName)(subgraph, &raw mut name))
          .map_err(|error| error.to_string())?;
        let mut nodes = ptr::null();
        let mut node_count = 0;
        ort::Error::result_from_status((api.EpAssignedSubgraph_GetNodes)(
          subgraph, &raw mut nodes, &raw mut node_count,
        ))
        .map_err(|error| error.to_string())?;
        if CStr::from_ptr(name).to_bytes() == expected.as_bytes() && node_count > 0 {
          return Ok(());
        }
      }
    }
  }
  Err(format!(
    "{provider:?} did not accept any model nodes; refusing to report CPU inference as GPU"
  ))
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]
  use super::*;

  #[test]
  fn cpu_session_cannot_be_reported_as_cuda() -> Result<(), String> {
    use base64::Engine;
    // A one-element Identity graph, opset 18. No downloaded model is needed.
    let bytes = base64::engine::general_purpose::STANDARD.decode("CAo6PgoQCgF4EgF5IghJZGVudGl0eRIIY3B1LW9ubHlaDwoBeBIKCggIARIECgIIAWIPCgF5EgoKCAgBEgQKAggBQgQKABAS")
      .map_err(|error| error.to_string())?;
    let environment = super::super::model::environment()?;
    let mut builder = Session::builder(environment)
      .map_err(|error| error.to_string())?
      .with_config_entry("session.record_ep_graph_assignment_info", "1")
      .map_err(|error| error.to_string())?;
    let session = builder.commit_from_memory(&bytes).map_err(|error| error.to_string())?;
    let error = verify_assignment(&session, ExecutionProvider::Cuda).unwrap_err();
    assert!(error.contains("refusing to report CPU inference as GPU"));
    Ok(())
  }

  #[cfg(target_os = "linux")]
  #[test]
  #[ignore = "Requires MANA_FISH_TEST_MODELS and no vendor runtimes in the process library path"]
  fn linux_auto_falls_back_when_vendor_runtimes_are_missing() -> Result<(), String> {
    let path = std::path::PathBuf::from(
      std::env::var("MANA_FISH_TEST_MODELS").map_err(|error| error.to_string())?,
    )
    .join("yolo26n.onnx");
    for preference in supported_preferences().into_iter().filter(|preference| {
      !matches!(preference, ExecutionProviderPreference::Auto | ExecutionProviderPreference::Cpu)
    }) {
      let error = super::super::model::DetectionModel::load(&path, preference)
        .err()
        .ok_or("Expected unavailable GPU error")?;
      assert!(error.contains("requires"), "{preference:?}: {error}");
    }
    let (_, provider) =
      super::super::model::DetectionModel::load(&path, ExecutionProviderPreference::Auto)?;
    assert_eq!(provider, ExecutionProvider::Cpu);
    Ok(())
  }

  #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
  #[test]
  #[ignore = "Requires MANA_FISH_TEST_MODELS, OpenVINO 2026.4.1 runtime, and no Intel GPU"]
  fn openvino_cpu_runtime_does_not_satisfy_gpu_request() -> Result<(), String> {
    let path = std::path::PathBuf::from(
      std::env::var("MANA_FISH_TEST_MODELS").map_err(|error| error.to_string())?,
    )
    .join("yolo26n.onnx");
    let error =
      super::super::model::DetectionModel::load(&path, ExecutionProviderPreference::OpenVino)
        .err()
        .ok_or("CPU OpenVINO must not satisfy the GPU request")?;
    assert!(error.contains("OpenVINO did not discover an Intel GPU"), "{error}");
    Ok(())
  }

  #[test]
  fn cpu_never_initializes_a_gpu() {
    let ((), provider) = select(ExecutionProviderPreference::Cpu, |provider| {
      assert_eq!(provider, ExecutionProvider::Cpu);
      Ok(())
    })
    .unwrap();
    assert_eq!(provider, ExecutionProvider::Cpu);
  }

  #[test]
  fn auto_tries_every_gpu_before_cpu() {
    let mut attempted = Vec::new();
    let ((), provider) = select(ExecutionProviderPreference::Auto, |provider| {
      attempted.push(provider);
      if provider == ExecutionProvider::Cpu {
        Ok(())
      } else {
        Err("missing runtime or failed warmup".into())
      }
    })
    .unwrap();
    let mut expected = gpu_providers();
    expected.push(ExecutionProvider::Cpu);
    assert_eq!(attempted, expected);
    assert_eq!(provider, ExecutionProvider::Cpu);
  }

  #[test]
  fn explicit_gpu_reports_every_failure_without_cpu() {
    if gpu_providers().is_empty() {
      return;
    }
    let mut attempted = Vec::new();
    let error = select::<()>(ExecutionProviderPreference::Gpu, |provider| {
      attempted.push(provider);
      Err("missing runtime".into())
    })
    .unwrap_err();
    assert_eq!(attempted, gpu_providers());
    assert!(error.contains("missing runtime"));
  }

  #[test]
  fn auto_stops_at_the_first_working_gpu() {
    let Some(first) = gpu_providers().first().copied() else {
      return;
    };
    let ((), provider) = select(ExecutionProviderPreference::Auto, |provider| {
      assert_eq!(provider, first);
      Ok(())
    })
    .unwrap();
    assert_eq!(provider, first);
  }

  #[cfg(target_os = "linux")]
  #[test]
  fn explicit_vendor_never_tries_other_providers() {
    let mut attempted = Vec::new();
    assert!(
      select::<()>(ExecutionProviderPreference::Cuda, |provider| {
        attempted.push(provider);
        Err("CUDA unavailable".into())
      })
      .is_err()
    );
    assert_eq!(attempted, vec![ExecutionProvider::Cuda]);
    assert!(supported_preferences().contains(&ExecutionProviderPreference::Cuda));
  }
}
