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

Android and iOS run the same Rust ONNX model parser, postprocessing and tracker
as desktop. They use the existing WebRTC video element for frames instead of
opening another RTSP connection. Detection settings, downloads/imports, class
filters, overlay and input bindings are available on mobile. Start with YOLO26n;
the larger models can use substantially more memory and time. Download models
before attaching the Android ROV tether, which routes the app away from the
internet.

### Runtime and acceleration

`ort = 2.0.0-rc.15` downloads and verifies pinned ONNX Runtime 1.31.0 / API 31
static archives for Android ARM64/x86-64 and iOS ARM64 device/ARM64 simulator.
These are the supported detection build targets. The pinned artifacts do not
include Android 32-bit or Intel iOS simulator builds. Tauri packages Android's
NDK `libc++_shared.so` alongside the app library. Both local APKs passed debug-signature verification and
runtime-notice checks; ARM64 also passed 16 KiB ZIP/ELF alignment checks.
iOS links Foundation and Core ML
through `ort-sys`; the archive's Mach-O minimum is iOS 15.1, matching the app's
minimum deployment target. Both mobile bundles contain the runtime's MIT
license and full third-party notices from the same pinned release, under
`licenses/onnxruntime`.

Android Auto tries NNAPI with FP16 disabled and NNAPI CPU devices excluded,
then falls back to ONNX Runtime CPU. The accelerator selector names NNAPI
explicitly, because a device may expose a GPU, an NPU, or neither. NNAPI is
supported by this pinned ONNX Runtime but deprecated in Android API 35; it is
not a promise of optimal performance on recent phones. The current upstream
Rust distributions ship NNAPI, while QNN needs a separate Qualcomm runtime and
device/model constraints. No QNN SDK or unvalidated WebGPU path is bundled.

On iOS, Auto tries Core ML's MLProgram format, then CPU. Explicit accelerator
requests report errors instead of falling back to CPU. All accelerator sessions
must accept model nodes and pass an inference warmup; a registered provider
that leaves the whole graph on ONNX Runtime CPU is rejected. Unsupported
operators may still use CPU. Status reports the selected backend; Core ML
chooses its underlying Apple compute units, so its name does not prove that
every operator ran on the GPU or Neural Engine. Mobile CPU sessions use two
intra-op threads and one inter-op thread.

### Capture, storage and lifecycle

Capture requests the newest decoded video frame with `requestVideoFrameCallback`
when available, with a timer/currentTime fallback. Its ceiling is 5 fps. An
exponential moving average of acknowledged processing latency lowers the rate
for slow models, leaving at least 20% idle time between requests. This is a
playback/controls budget, not a thermal sensor. It waits for
native inference to acknowledge each binary request before reading another
frame, so slow inference drops sampling opportunities instead of building a
backlog. Native input also has a one-frame queue. A session identifier rejects
late frames after a restart. Each request contains the original video dimensions,
a capture timestamp and a letterboxed RGBA image, with a 32-byte header. The
capture canvas/context and outgoing packet are reused until dimensions change.
Rust converts RGBA directly into its reused planar float input and decodes the
borrowed ORT output. Tauri's borrowed body still requires one owned native copy;
this is not zero-copy IPC. Native
code checks dimensions, timestamp and exact byte length before copying pixels;
model inputs are limited to 1024 pixels per dimension on mobile (at most 4 MiB
of pixels per request). The application sends a binary body rather than a JSON pixel array or an
application-level base64 encoding.

Canvas uses the displayed video's natural orientation. Letterboxing and the
existing object-contain overlay use its source dimensions; resizing/orientation
changes also reset tracking. Playback does not wait for inference. The controller
waits for actual video playback, pauses when the video buffers, disappears or the
app becomes inactive, and restarts after playback/foreground returns. Native
Android/iOS suspend events also signal the worker and arrange cleanup off the
UI thread. Cancellation discards old results and waits for native sessions to
release before replacement; an in-progress vendor model compilation/kernel must
finish before its resources can be released. A ten-second no-frame timeout is
a final cleanup backstop.

Model downloads and imports use Tauri's sandboxed app-data directory. Imports
use the native document picker and remove its temporary copy after validation.
Android picker copies have unique cache filenames. Files over 512 MiB are
rejected before library staging, IDs cannot escape the library directory,
downloads retain catalog size/hash verification and cancellation, and installation
remains atomic after model validation.

Confidence and class-filter changes update the existing worker without a model
or stream reload. Both IPC and the worker retain only the latest settings, and
updates carry the run ID so an old run cannot modify its replacement. The
threshold governs new tracks; low-confidence observations down to
`min(threshold, 0.1)` may continue existing tracks. Excluded classes are removed
from tracker history and hidden immediately in the overlay. Model/provider,
source, playback and foreground/resume changes still restart the session. A
ready video-element replacement also counts as a source change.

The overlay resizes its backing store only when CSS size or pixel ratio changes.
It paints on results, display settings, resize/DPR/visibility changes and one
stale-result deadline, replacing the previous 250 ms polling repaint. Results
still expire after one second. All timers, video callbacks and observers are
cancelled when their owner is disposed.

See [detection performance](detection-performance.md) for stage definitions,
reproducible benchmarks, cache support and measured limitations.

### Building and validation

On Linux, the Nix mobile shell supplies Rust 1.99, SDK/NDK and Java. Build a
local ARM64 debug APK without release signing credentials:

```sh
nix develop .#mobile
bun run android:init
bun tauri android build --debug --apk --target aarch64 --ci
```

The APK is generated under
`src-tauri/gen/android/app/build/outputs/apk/universal/debug/`.
`--target x86_64` uses the pinned Android emulator architecture instead.
On a Mac with Xcode, use `bun run ios:init` and
`bun tauri ios build --no-sign --target aarch64`; Apple Silicon simulator
builds use Tauri's ARM64 simulator target. CI builds a debug Android APK and
an unsigned iOS app in addition to mobile Clippy checks.

The mobile worker also compiles in host tests. The opt-in real-image test
exercises RGBA conversion, inference, source dimensions, tracking and IPC
acknowledgements with all seven models. Prepare the same letterboxed RGB24
bus fixture, then run:

```sh
ffmpeg -i /path/to/bus.jpg -vf 'scale=480:640,pad=640:640:80:0:color=0x727272' \
  -f rawvideo -pix_fmt rgb24 /tmp/bus.rgb
MANA_FISH_TEST_MODELS=/path/to/all-seven-onnx-files \
MANA_FISH_TEST_RGB=/tmp/bus.rgb \
  cargo test --manifest-path src-tauri/Cargo.toml --lib \
  mobile_frames_run_real_catalog_models_and_release_pending_ipc -- --ignored
```

This host test passed with all seven catalog models, including person/bus
tracking for the general models. It does not execute Android NNAPI or iOS
Core ML. Android ARM64 and x86-64 debug APK builds and Clippy, frontend builds, binary packet
validation, bounded capture, cancellation, playback/foreground lifecycle and
backend status tests are covered locally. No phone, accessible emulator or
Mac/Xcode was available through the device service. iOS native linking, real
mobile accelerator correctness, live stream alignment, sustained frame rate,
thermal behavior and memory pressure still need device validation. The workflow
changes have not been run on GitHub.

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
missing-runtime fallback also passed. All seven models also passed the same two-run real-image comparison on the
Radeon 890M (`gfx1150`) with ROCm/MIGraphX 7.2.3. No architecture override or
reduced-precision mode was used. The required libraries were downloaded from
the signed Nix binary cache and verified before use. The full AMD validation
took about 23 minutes, including model compilation, warmups and CPU references.
MIGraphX model loading can take several minutes; this test does not establish
sustained live-stream performance. This result covers this GPU/runtime pair,
not every Radeon device. Intel GPU inference is untested because
there is no Intel GPU. With the matching OpenVINO runtime installed, its plugin
loaded and correctly rejected this machine instead of using its CPU device.
These providers require hardware validation with the
command above before claiming compatibility with a specific GPU/runtime.

After integrating main at `fe3847a`, all seven CUDA comparisons passed again.
The `1.1.0-rc.5` debug `.deb` built successfully; its runtime manifest hashes
and read permissions passed verification, and all seven comparisons passed
using the extracted runtime. Loader tracing confirmed that the packaged core
was used. Missing-runtime Auto fallback, explicit-provider errors, and
OpenVINO CPU-device rejection also passed.

Before integration, local packaging also produced an RPM using a temporary
stable-version override. RPM bundling rejects SemVer prerelease strings; main
now intentionally skips RPM releases for prereleases. No app version override
was committed. Pinned linuxdeploy successfully processed the GPU
libraries with the vendor dependency exclusions. A complete AppImage could not
be built on this NixOS host. Retrying with local helper copies adapted for NixOS
and an explicit GTK library path reached GLib schema installation. The GTK
plugin expects the `gio-2.0.pc` schema directory to contain distro-wide schemas;
Nix stores those in separate package outputs, so that step still fails. The Ubuntu release workflow is configured but was not run here.
ARM64 packaging and Windows/macOS runtime behavior were not exercised here.

Publish verified model files and their required source materials before
shipping an app catalog that enables their URLs. Use fixed release URLs and
retain the expected hashes. Model releases belong in the models repository,
independent of app releases and the app updater.
