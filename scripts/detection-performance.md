# Detection performance

## What changed

Postprocessing settings use one latest-value slot in each native worker. Slider
and class-filter changes no longer pay the 400 ms restart debounce or reload a
session. IPC updates carry a run ID, are coalesced while in flight and are applied
after ORT finishes, before decoding that frame. The worker publishes results
under the same settings lock, so an update cannot acknowledge before an older
result is published. The updater releases the runner registry lock before waiting
for postprocessing, so settings changes do not make frame submission report busy.
Stopped-run checks happen after acquiring the settings lock. Desktop frame errors
can recover while keeping live settings available. Model, provider, source and
lifecycle changes still restart.

Mobile conversion removes the RGB24 allocation (1,228,800 bytes at 640x640) and
writes RGBA directly to the existing CHW float buffer. Alpha is ignored. Fully
covered input avoids a redundant grey fill; strided desktop RGB retains checked
padding and length handling. Both workers decode a borrowed ORT output, removing
one output allocation/copy (2,822,400 bytes for a YOLO11 COCO 84x8400 output).
Output sizes differ across catalog models.

The frontend reuses its packet allocation only after native acknowledgement.
`getImageData` still allocates a readback, packet assembly still copies pixels,
and Tauri's borrowed request body still requires an owned native copy. An owned
packet can retain its allocation through parsing; this does not make the current
IPC transport zero-copy. Malformed wire data is rejected before the owned copy.

Mobile scheduling requests a decoded frame only after acknowledgement and the
next sample deadline. Fallback timers check `currentTime`. The maximum is 5 fps;
an EWMA of request latency (weight 0.2) lowers the target and each slow request
gets 25% of its processing time as an idle gap (20% idle duty share), capped
at two seconds so the native worker does not mistake intentional cooldown for
a missing source. Native idle expiry starts after a frame completes.
There is no thermal measurement or claim. Cancellation, hidden/paused playback,
resume generations and source replacement are covered by fake-clock tests.

Canvas tests verify dimension reuse, DPR/size changes, current class filters,
visibility cleanup and a single stale-frame clear at 1000 ms. An unchanged result
previously repainted every 250 ms; it now paints on arrival and clears once at
expiration. There are no periodic paints afterward.

## Compilation caches

The app enables only the supported vendor APIs below. Cache failures retry an
uncached session on the same provider before normal Auto fallback is considered.
Caches live under Tauri's sandbox-safe app-cache directory in
`detection-compiled-v1`. They do not alter model files or reviewed catalog hashes.

| Provider                      | Implementation and validation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core ML                       | `ort` rc.15 `with_model_cache_dir` / ORT `ModelCacheDirectory`. Identity includes the full model SHA-256, ORT build info, wrapper/cache schema, OS/architecture, hardware model/machine, OS build and model format/options. iOS keeps MLProgram; macOS keeps NeuralNetwork. No Apple native toolchain/device was available, so cache reuse and speedup are unmeasured.                                                                                                                                                                                                                                                                                                                                                                                            |
| OpenVINO                      | API 31 device selection with `load_config.GPU.CACHE_DIR`; the legacy `cache_dir` option is rejected by this API. Identity includes full model SHA-256, ORT build, loaded ORT/OpenVINO/Intel OpenCL library content hashes, kernel, Intel PCI IDs and f32/options. Vendor blobs additionally validate device/driver compatibility. The plugin loads but this host has no Intel GPU; GPU cache reuse is unmeasured.                                                                                                                                                                                                                                                                                                                                                 |
| MIGraphX                      | No app compilation cache enabled. In the shipped CUDA-derived shared core, generic `SessionOptionsAppendExecutionProvider("MIGraphX", ...)` returns "not supported in this build". The vendor provider lacks `CreateEpFactories`. A separate probe of the pinned MIGraphX-derived core accepts the cache API but rejects CUDA registration ("not enabled in this build"), so swapping cores would regress NVIDIA support. rc.15's `with_save_model` / `with_load_model` populate obsolete fields ignored by ORT 1.31's `MIGraphXExecutionProviderInfo` conversion. `ORT_MIGRAPHX_MODEL_CACHE_PATH` exists, but mutating process-wide environment variables from concurrent Rust inference threads is not a defensible per-model API. No cache speedup is claimed. |
| CUDA / NNAPI / DirectML / CPU | No new compilation cache. Existing provider precision and tuning choices are unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Caches admit at most eight identities and 1 GiB of completed data. Once full,
new identities run uncached; the OS/user can clear this disposable directory.
Vendor writes are not quota-controlled during compilation; an oversized result
is removed after session teardown. Private directories, bounded
manifest traversal and SHA-256 integrity manifests reject linked, interrupted or
corrupt entries before vendor deserialization. Integrity is for accidental
corruption, not protection against the same OS account modifying both files and
manifest. Unit tests cover changed weights, runtime/OS/device/options keys,
corruption, incomplete writes, links and admission bounds.

API evidence is pinned to ORT v1.31.0:

- `onnxruntime/core/providers/migraphx/migraphx_execution_provider_info.cc`
- `onnxruntime/core/session/provider_registration.cc`
- `onnxruntime/core/providers/openvino/openvino_provider_factory.cc`
- `ort-2.0.0-rc.15/src/ep/{migraphx,coreml,openvino}.rs`

## Timing definitions and opt-in diagnostics

The settings UI says **Frame processing time**. The existing `inferenceMs` wire
field covers native preprocessing, ORT, postprocessing/tracking and result
publication, not just the model's GPU kernels. `latencyMs` is decoded/captured
frame age at native publication using the common Unix-epoch timestamp. It is
not camera-to-display latency and can be affected by wall-clock adjustments.

Set `MANA_FISH_DETECTION_DIAGNOSTICS=1` before launching the app for at most one
native stage-average log per second per worker: native queue wait, preprocessing,
ORT, decode and tracking. Desktop preprocessing includes FFmpeg scaling; queue
wait starts when the decoded frame became available. Mobile queue wait starts
when the parsed packet is submitted. ORT duration includes runtime transfers and
synchronization, not an isolated GPU-kernel timer.

In the webview, set `localStorage.detectionDiagnostics = '1'` and reload. Calling
`detectionTimings()` in its console returns aggregate capture, submit-round-trip
and canvas-render durations. Disable/remove the key and reload to turn it off.
Capture includes canvas draw/readback and packet assembly; submit-round-trip
includes IPC, native work and acknowledgement. Render measures canvas calls,
not compositor/display latency. These use `performance.now()` in that webview.
Native stages use Rust `Instant`. No unrelated clocks are subtracted to invent
transport latency; IPC transport alone is not separately measurable here.

## Reproduce host benchmarks

Use the native development shell and staged runtime described in
[detection models](detection-models.md). CUDA requires the matching vendor
libraries and driver on the dynamic loader path; ROCm/MIGraphX requires its full
runtime closure. Run one provider at a time.

```sh
# No models/runtime required for these alternating release microbenchmarks.
cargo test --release --manifest-path src-tauri/Cargo.toml --lib \
  benchmark_mobile_input_copies -- --ignored --nocapture
cargo test --release --manifest-path src-tauri/Cargo.toml --lib \
  benchmark_output_copy -- --ignored --nocapture

MANA_FISH_TEST_MODELS=/path/to/all-seven-onnx-files \
MANA_FISH_TEST_IMAGE=/path/to/bus.jpg \
MANA_FISH_TEST_PROVIDER=cuda \
  cargo test --release --manifest-path src-tauri/Cargo.toml --lib \
  benchmark_catalog_stage_latency -- --ignored --nocapture
```

Use `cpu` or `migraphx` for the other measured providers. Each model prints one
`BENCHMARK` JSON record with session load and p50/p95/mean stages for 24 sequential
real-image executions. CPU/CUDA measure two session loads; MIGraphX measures one
to avoid repeating minutes of uncached compilation. Session loading includes
model validation/warmups. This is not an empty OS/vendor-cache measurement.
FFmpeg decodes/scales the fixture before timed frames; benchmark preprocessing
measures strided RGB to CHW conversion. Native live diagnostics include scaling.
These short runs do not establish phone thermal behavior or live playback FPS.

The separate `catalog_models_match_cpu_on_requested_gpu` test compares raw output
(where ordering is stable), decoded classes/scores/boxes and direct RGBA against
strided RGB. Marine-model bus-image agreement is numerical parity, not an
accuracy assessment on marine imagery. Lower precision/quantization is unchanged.

## Host measurements (2026-11-08)

Release build on the existing host, 640x640 bus fixture, pinned seven-model
catalog, ORT 1.31.0, default host CPU thread policy and NVIDIA RTX 5080 Laptop GPU.
GPU runtimes are those recorded in detection-models.md. Host load and GPU power
state affect these numbers; they are a reproducible sample, not a speed promise.

| Model            | CPU ORT p50 / p95 ms | CUDA ORT p50 / p95 ms | CUDA session loads, first / second ms |
| ---------------- | -------------------: | --------------------: | ------------------------------------: |
| yolo26n          |        32.75 / 43.39 |           4.85 / 5.57 |                             681 / 106 |
| yolo26s          |       78.47 / 114.28 |         11.19 / 11.68 |                              209 / 86 |
| yolo26m          |      196.34 / 213.98 |         31.28 / 44.74 |                             150 / 124 |
| yolo11n          |        31.20 / 36.01 |           5.87 / 9.49 |                               77 / 72 |
| yolo11s          |        75.17 / 76.97 |         11.22 / 11.87 |                               79 / 79 |
| marine-fishinv   |      343.00 / 407.90 |         46.82 / 74.69 |                             165 / 147 |
| marine-megafauna |      355.12 / 538.65 |         48.63 / 73.95 |                             169 / 153 |

Input/output copy measurements and Radeon results are recorded with the final
validation artifacts. Real phones, macOS/iOS and Intel GPU remain unavailable;
no battery, thermal, Core ML or Intel GPU cache speedup is claimed.
