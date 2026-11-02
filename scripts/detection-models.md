# Detection model catalog

The catalog, model documentation, license status, and export tooling are
maintained in [manafishrov/detection-models](https://github.com/manafishrov/detection-models).

This app embeds a reviewed snapshot in `src-tauri/src/detection/catalog.json`.
The current snapshot is from [model release v1.0.0](https://github.com/manafishrov/detection-models/releases/tag/v1.0.0).
Model IDs and SHA-256 hashes identify the installed bytes. The downloader
accepts only catalog IDs, checks the pinned size and hash, and validates the
ONNX model before installation. Updating the external repository does not
change installed apps; refresh this snapshot through an app change.

The five general models use official Ultralytics `v8.4.0` ONNX downloads.
The two marine models use the ONNX exports in the dedicated model release.
Both original checkpoints explicitly declare AGPL-3.0; their recorded
[license evidence](https://github.com/manafishrov/detection-models/blob/v1.0.0/license-evidence/marine-detect.json)
identifies the exact source hashes. The release retains the original checkpoints,
source archives, conversion tooling references and applicable notices.

The models repository owns the source checkpoint hashes, export script, tool
versions, model notes, and publication prerequisites. Use its
[preparation instructions](https://github.com/manafishrov/detection-models#prepare-marine-exports)
when regenerating ONNX files. Model binaries and checkpoints stay out of Git.

For a catalog update, copy the reviewed `catalog.json` here, keep unavailable
URLs null, and run the app's normal quality checks. The opt-in native test also
checks actual model hashes, loads each model, and runs CPU inference without
modifying the user's installed library:

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

Auto uses CPU on Linux because the WebGPU backend produced incorrect detections
on NVIDIA hardware. Windows uses DirectML and macOS uses Core ML when available,
with CPU fallback. Explicit GPU selection fails if the platform has no supported
backend.

Publish verified model files and their required source materials before
shipping an app catalog that enables their URLs. Use fixed release URLs and
retain the expected hashes. Model releases belong in the models repository,
independent of app releases and the app updater.
