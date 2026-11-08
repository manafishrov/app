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

A nonblocking filesystem lock is held through session teardown and integrity
publication. Other app processes use uncached sessions while that cache is in
use, avoiding concurrent writers and deletion of live compiled files.

Caches admit at most eight identities and 1 GiB of completed data. Once full,
new identities run uncached; the OS/user can clear this disposable directory.
Vendor writes are not quota-controlled during compilation; an oversized result
is removed after session teardown. Private directories, bounded
manifest traversal and SHA-256 integrity manifests reject linked, interrupted or
corrupt entries before vendor deserialization. Integrity is for accidental
corruption, not protection against the same OS account modifying both files and
manifest. Unit tests cover changed weights, runtime/OS/device/options keys,
corruption, incomplete writes, links, concurrent cache users and admission bounds.

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

Release build on AMD Ryzen AI 9 HX 370 (12 cores / 24 threads), Radeon 890M
(`gfx1150`, ROCm/MIGraphX 7.2.3), NVIDIA RTX 5080 Laptop GPU (16303 MiB,
driver 595.71.05), ORT 1.31.0, 640x640 bus fixture, and the pinned seven-model
catalog. Host CPU sessions use the desktop default thread policy. GPU clocks,
power state and host load affect short samples; these are measurements, not a
speed promise. The 60-second runs below show different steady operating states.

Paired input conversion benchmark, 200 alternating iterations, with the owned
pixel copy included in both paths:

| Conversion                   | p50 ms | p95 ms |
| ---------------------------- | -----: | -----: |
| previous_owned_copy_then_rgb |  1.318 |  1.526 |
| owned_copy_direct_rgba       |  0.666 |  0.808 |

The median conversion time decreased 49.5%. This isolates the owned
pixel copy and RGB/RGBA-to-CHW conversion; it excludes canvas, packet headers,
IPC, ORT and rendering. The eliminated RGB payload is 1,228,800 bytes at 640x640;
allocator capacities and calls may differ from this logical payload size.

The separate 2,822,400-byte output benchmark measured the old Rust Vec
allocation/copy/drop at 0.040 ms p50 / 0.073 ms p95. Borrowing
adds no such Rust buffer. ORT tensor allocation and GPU-to-host transfers remain.
No end-to-end phone speedup or zero-copy transport is inferred from these tests.

The stage benchmark reports 24 warmed executions per model. Values below are
ORT p50 / p95 milliseconds; the JSON artifact also retains preprocessing,
decode, tracking, total frame work and session loads.

| Model            |      CPU ORT ms |   CUDA ORT ms |   Radeon ORT ms | Radeon session load, seconds |
| ---------------- | --------------: | ------------: | --------------: | ---------------------------: |
| yolo26n          |   25.20 / 28.16 |   3.83 / 3.86 |   14.97 / 17.85 |                        166.5 |
| yolo26s          |   50.31 / 53.28 |   9.69 / 9.76 |   27.29 / 31.26 |                        231.9 |
| yolo26m          | 117.02 / 124.11 | 26.01 / 35.64 |   41.69 / 44.16 |                        311.3 |
| yolo11n          |   21.81 / 23.11 |   4.99 / 5.20 |     7.15 / 9.16 |                         93.2 |
| yolo11s          |   48.43 / 51.09 |   9.08 / 9.27 |   16.74 / 17.10 |                        152.1 |
| marine-fishinv   | 211.98 / 221.01 | 36.95 / 58.35 |  96.82 / 108.19 |                        347.6 |
| marine-megafauna | 221.25 / 250.02 | 36.33 / 59.03 | 111.76 / 125.98 |                        399.8 |

CPU and CUDA first/repeat session loads (milliseconds; existing vendor caches
preserved):

| Model            | CPU first / repeat | CUDA first / repeat |
| ---------------- | -----------------: | ------------------: |
| yolo26n          |        70.4 / 45.1 |       2899.0 / 62.7 |
| yolo26s          |        97.9 / 89.3 |        172.4 / 69.8 |
| yolo26m          |      191.2 / 181.2 |        105.4 / 99.9 |
| yolo11n          |        87.2 / 93.1 |         79.8 / 80.8 |
| yolo11s          |        94.4 / 76.8 |         70.2 / 78.2 |
| marine-fishinv   |      350.9 / 349.3 |       142.6 / 120.3 |
| marine-megafauna |      336.8 / 336.6 |       118.5 / 118.8 |

One-minute continuous YOLO26n runs include input conversion, ORT, decode,
tracking and per-frame output-stability assertions. FFmpeg scaling, IPC,
playback and compositor work are excluded. These are host inference-loop
throughput measurements, not the app's capture rate or phone FPS:

| Provider | Frames / seconds | Frame work p50 / p95 ms | Native RSS before / after, MiB |
| -------- | ---------------: | ----------------------: | -----------------------------: |
| cuda     |    13265 / 60.00 |             4.51 / 4.68 |                1131.5 / 1134.0 |
| migraphx |     6788 / 60.01 |            8.15 / 13.86 |                2234.4 / 2234.5 |

Both runs retained stable decoded classes, confidence and boxes throughout.
RSS snapshots are process resident memory, not GPU memory or a leak proof.
The repeated uncached Radeon YOLO26n session load in this run was
115.5 seconds; compilation is still expensive. The app's mobile capture
ceiling remains 5 fps. One minute does not establish long-duration thermal,
battery or live-playback performance.

Run the same sustained check with the stage benchmark environment and
`benchmark_sustained_model_execution -- --ignored --nocapture`.
`MANA_FISH_TEST_MODEL` optionally selects another catalog model; the default is
YOLO26n. This path also keeps output-stability assertions enabled.

All seven models passed CPU numerical/detection parity on both GPUs, including
direct RGBA against strided RGB. The final Radeon parity run took 1963 seconds,
including compilation and CPU references. All seven also passed the host mobile
worker test with six RGBA frames each: filter removal, raised/lowered confidence,
track confirmation/recovery, dimensions and acknowledgements on one loaded
session. The mobile worker host test proves behavior, not phone throughput.

Final local regression checks: 103 Rust tests, 343 frontend tests, 19 Python
tests, frontend/Rust formatting, frontend lint, and warnings-denied Clippy on
Linux and Android ARM64/x86-64. The iOS frontend bundle builds; native iOS still
requires macOS/Xcode. Android ARM64/x86-64 debug APKs and a Linux debug deb are
recorded in `target/artifacts/optimization/build-manifest.json` with checksums,
runtime manifest checks, signatures and 16 KiB ZIP/ELF alignment verification.
The stage and sustained records are in `target/artifacts/optimization/performance.json`.

Real phones, macOS/iOS and Intel GPU remain unavailable. Core ML/OpenVINO cache
speedups, phone memory pressure, thermal/battery behavior and live stream
alignment remain unmeasured. Full AppImage packaging retains the existing NixOS
GLib schema limitation described in detection-models.md. Lower precision and
reviewed model hashes are unchanged.
