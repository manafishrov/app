# Detection model catalog

The catalog, model documentation, license status, and export tooling are
maintained in [manafishrov/detection-models](https://github.com/manafishrov/detection-models).

This app embeds a reviewed snapshot in `src-tauri/src/detection/catalog.json`.
The current snapshot is from [model release v1.1.0](https://github.com/manafishrov/detection-models/releases/tag/v1.1.0).
Its exact release-catalog SHA-256 is recorded in `scripts/detection-catalog-pin.json`.
Model IDs and SHA-256 hashes identify the installed bytes. The downloader
accepts only catalog IDs, checks the pinned size and hash, and validates the
ONNX model before installation. Updating the external repository does not
change installed apps; refresh this snapshot through an app change.

All seven ONNX downloads are hosted in the pinned Manafish model release.
The five general models retain the exact bytes from the Ultralytics assets
`v8.4.0` release; that asset tag is not the exporter version. `upstreamAssetUrl`
and `sourceWeights` record provenance rather than runtime download locations.
The two marine models retain the ONNX exports from model release `v1.0.0`.
Both original checkpoints explicitly declare AGPL-3.0; their recorded
[license evidence](https://github.com/manafishrov/detection-models/blob/v1.0.0/license-evidence/marine-detect.json)
identifies the exact source hashes. The release retains the original checkpoints,
source archives, conversion tooling references and applicable notices.

The models repository owns the source checkpoint hashes, export script, tool
versions, model notes, and publication prerequisites. Use its
[preparation instructions](https://github.com/manafishrov/detection-models#prepare-marine-exports)
when regenerating ONNX files. Model binaries and checkpoints stay out of Git.

## Syncing a reviewed release

The sync script uses only an explicit stable release and a reviewed SHA-256.
It verifies the exact catalog bytes, seven approved IDs, unique ONNX filenames,
size/hash pins, and download URLs before changing the embedded snapshot or pin.
It does not fetch `latest`, a branch, or a runtime-mutable catalog.

To adopt a reviewed release (replace both values with the reviewed pins):

```sh
python3 -I scripts/sync-detection-catalog.py \
  --version v1.1.0 \
  --sha256 62de9c20014e500cb5a743deb3a77f44b319d8705463913aebf75d859da5669c
```

To fetch the recorded release and detect remote or local drift without writing:

```sh
python3 -I scripts/sync-detection-catalog.py --check
```

`--catalog /path/to/release/catalog.json` substitutes a local file for the fetch
for offline review or pre-publication verification; it still enforces the
recorded hash and release URLs. Commit the exact catalog bytes, the pin, and
reviewed app changes together. Run the normal app gates and the offline script
tests (`python3 -I -m unittest discover -s scripts -p '*_test.py'`).

The opt-in native test also checks actual model hashes, loads each model, and
runs CPU inference without modifying the user's installed library:

```sh
MANA_FISH_TEST_MODELS=/path/to/all-seven-onnx-files \
  cargo test --manifest-path src-tauri/Cargo.toml \
  detection::catalog::tests::real_catalog_assets_match_pins_and_run_on_cpu \
  --lib -- --ignored
```

To exercise downloads and installation directly from all seven public URLs:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --lib \
  detection::catalog::tests::downloads_and_installs_all_catalog_models_into_an_isolated_library \
  -- --ignored
```

The real-image test uses Ultralytics' `bus.jpg` fixture to check FFmpeg decoding,
preprocessing, detection boxes and tracking with all five general models:

```sh
MANA_FISH_TEST_MODELS=/path/to/all-seven-onnx-files \
MANA_FISH_TEST_IMAGE=/path/to/ultralytics/assets/bus.jpg \
  cargo test --manifest-path src-tauri/Cargo.toml --lib \
  detection::runner::tests::general_catalog_models_detect_and_track_objects_in_a_decoded_image \
  -- --ignored
```

## Android and iOS

Detection is desktop-only. Mobile builds omit ONNX Runtime, FFmpeg decoding,
the detection worker and its Tauri commands. The settings entry and input
bindings are hidden; opening the detection settings URL directly shows an
unavailable message. An imported config may retain detection settings, but
the mobile controller never starts inference or invokes desktop commands.

Mobile support needs a packaged ONNX Runtime for each target, a mobile frame
source (the desktop worker currently reads RTSP through FFmpeg), sandboxed
model downloads/imports and storage, and lifecycle/cancellation handling.
Android acceleration needs a validated NNAPI or other supported execution
provider; iOS needs a validated Core ML provider. CPU inference must also be
tested on both platforms. Performance, memory, thermal load, orientation and
overlay alignment need tests on real phones before enabling the UI.

The integrated branch passes an Android ARM64 Rust `cargo check --lib`,
Android/iOS frontend builds, and dependency checks excluding ONNX Runtime,
FFmpeg and SDL from both mobile targets. The frontend regression test imports
an enabled detection config on mobile and verifies that no detection IPC is
called. No APK/IPA or mobile hardware test was performed; iOS native checks
require macOS and Xcode.

## Linux GPU backends

The hardware selector lists the backends compiled into the native app. Their
presence in the list does not mean the machine has a compatible GPU or runtime.
Linux x86-64 offers NVIDIA CUDA, AMD MIGraphX (ROCm), and Intel GPU (OpenVINO).
Linux ARM64 offers CUDA and CPU; the pinned upstream artifacts do not provide
ARM64 MIGraphX or OpenVINO. Windows uses DirectML and macOS uses Core ML.

| Linux choice         | Required hardware and host libraries                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NVIDIA CUDA          | CUDA-13-compatible NVIDIA GPU/driver, CUDA 13 (`libcudart.so.13`, `libcublas.so.13`, `libcublasLt.so.13`, `libcurand.so.10`), cuDNN 9 for CUDA 13 (`libcudnn.so.9` and its component libraries).                |
| AMD MIGraphX (ROCm)  | A GPU supported by the installed ROCm release, ROCm 7 (`libamdhip64.so.7`), MIGraphX 3 (`libmigraphx_c.so.3`) and its dependencies. An AMD display driver alone is insufficient.                                |
| Intel GPU (OpenVINO) | An OpenVINO-supported Intel GPU and Intel GPU compute drivers, OpenVINO 2026.4.1 (`libopenvino.so.2641`, `libopenvino_onnx_frontend.so.2641`, GPU plugin and dependencies). An Intel CPU alone is insufficient. |

Use the vendor's [CUDA installation instructions](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/),
[ROCm compatibility matrix](https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html),
and [OpenVINO requirements](https://docs.openvino.ai/2026/about-openvino/release-notes-openvino/system-requirements.html)
to check hardware and driver support. Make the runtime libraries discoverable by
the system loader before launching Manafish (`ldconfig` or `LD_LIBRARY_PATH`).
On NixOS, include the driver path (normally `/run/opengl-driver/lib`) and vendor
runtime library paths in the application's environment. Manafish does not
install drivers or change the process library search path.

Auto tries CUDA, MIGraphX, then Intel GPU OpenVINO, and finally CPU. GPU tries
the same GPU providers and reports all failures if none works. A named vendor
choice tries only that provider and returns its error. Model loading includes
an inference warmup, including static-output models, so missing cuDNN or a
kernel failure can trigger Auto's CPU fallback before detection starts.

The status names the selected backend. Registration alone is insufficient:
Manafish checks ONNX Runtime's graph assignments and rejects a GPU session
that accepted no model nodes. Supported GPU sessions may still execute shape
or unsupported operators on CPU. OpenVINO uses the plugin device API and selects
only an actual GPU device; it never requests CPU, AUTO, HETERO, or NPU execution.
CUDA disables TF32 and MIGraphX keeps reduced-precision modes disabled.

WebGPU/Vulkan remains disabled. On the test machine, default WebGPU output was
incorrect on NVIDIA. Forcing NCHW reduced a padded marine model's maximum raw
output error from about 108 to 0.002, but real-image YOLO26 and YOLO11 remained
incorrect, with divergence already in the first convolution. Full validation
and robustness did not resolve it. NCHW YOLO26 agreed with CPU on the Radeon
890M within 0.00031 for the tested image, but that limited result does not
validate all models or Intel. The app uses the native vendor providers instead.

### Preparing the Linux runtime

Before native development or tests, run on the target Linux architecture:

```sh
python3 scripts/prepare-linux-detection.py
```

The script requires Python 3, a native C++ linker, and `patchelf` (provided by
the Nix development shell). It verifies the exact SHA-256 pins from
`ort-sys = 2.0.0-rc.15` for ONNX Runtime 1.31.0 / API 31. It links the CUDA
artifact's PIC static core into a shared library, then stages that core with
matching CUDA, MIGraphX and OpenVINO provider libraries under
`src-tauri/detection-runtime/`. Other providers' core archives are discarded.
The shared bridge bytes must match between distributions. TensorRT and RTX
providers are not shipped. The script includes ONNX Runtime's pinned license
and third-party notices and writes a manifest with staged file hashes.

A shared core is needed because `ort` offers no combined CUDA/MIGraphX/OpenVINO
download, and the legacy MIGraphX provider resolves libraries beside its core.
Linux loads this core explicitly. macOS and Windows keep their existing
`ort` download/copy setup. No GPU vendor library is linked into the app or CPU
core. Missing vendor runtimes therefore leave CPU usable.

Release builds stage this directory and include it in deb, rpm and AppImage
resources. Installed Linux builds load it from
`../lib/Manafish/detection-runtime/` relative to the executable; debug builds
also search the source directory. Provider rpaths use `$ORIGIN`. The AppImage
build excludes external vendor libraries from linuxdeploy's dependency
collection; users supply the runtimes in the table above. The staging script
checks that the core loads and exposes API 31 without any vendor SDK installed.
GPU runtime libraries and the generated core stay out of Git.

### Hardware validation

Run all seven models against CPU using the same decoded real image and the
requested GPU. This test fails if the provider is unavailable or accepts no GPU
nodes; it cannot silently pass on CPU. It checks two runs per model, detection
classes, confidence and box agreement, and raw tensor agreement for models
whose rows are not reordered by end-to-end top-k selection:

```sh
MANA_FISH_TEST_MODELS=/path/to/all-seven-onnx-files \
MANA_FISH_TEST_IMAGE=/path/to/ultralytics/assets/bus.jpg \
MANA_FISH_TEST_PROVIDER=cuda \
  cargo test --manifest-path src-tauri/Cargo.toml --lib \
  catalog_models_match_cpu_on_requested_gpu -- --ignored --nocapture
```

Use `migraphx` or `openVino` for the other Linux providers. To exercise actual
missing-runtime errors and Auto's CPU fallback, run this in a process whose
library search path has none of the vendor runtimes:

```sh
MANA_FISH_TEST_MODELS=/path/to/all-seven-onnx-files \
  cargo test --manifest-path src-tauri/Cargo.toml --lib \
  linux_auto_falls_back_when_vendor_runtimes_are_missing -- --ignored
```

On 2026-11-07, all seven models passed the CPU comparison on an NVIDIA RTX 5080
Laptop GPU with driver 595.71.05, CUDA runtime 13.5.37, cuBLAS 13.10.0.20,
cuRAND 10.4.5.25 and cuDNN 9.28.1.4. The two marine models passed raw tensor
comparison on the bus fixture; this is numerical validation, not an accuracy
assessment on marine imagery. CPU inference through the packaged core and
missing-runtime fallback also passed. Native MIGraphX inference is untested:
ROCm/MIGraphX are absent on this host. Intel GPU inference is untested because
there is no Intel GPU. With the matching OpenVINO runtime installed, its plugin
loaded and correctly rejected this machine instead of using its CPU device.
These providers require hardware validation with the
command above before claiming compatibility with a specific GPU/runtime.

Local debug packaging produced a `.deb` whose extracted runtime passed all
seven CUDA comparisons, and an RPM using a temporary stable-version override.
The existing RPM bundler rejects the app's `1.1.0-rc.3` prerelease string; the
app version was not changed. Pinned linuxdeploy successfully processed the GPU
libraries with the vendor dependency exclusions. A complete AppImage could not
be built on this NixOS host: its GTK plugin could not locate the host GTK
installation (after adapting copied helper scripts' `/bin/bash` shebangs for
NixOS). The Ubuntu release workflow is configured but was not run here.
ARM64 packaging and Windows/macOS runtime behavior were not exercised here.

Publish verified model files and their required source materials before
shipping an app catalog that enables their URLs. Use fixed release URLs and
retain the expected hashes. Model releases belong in the models repository,
independent of app releases and the app updater.
