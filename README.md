# Manafish App

Control app for the Manafish ROV, built with [Tauri](https://tauri.app) and
[SolidJS](https://solidjs.com). It runs on macOS, Windows, Linux, Android and
iOS.

## Development

Install [Bun](https://bun.sh), [Rust](https://rustup.rs) and Python 3, or use
`nix develop`.

```sh
bun install
bun run tauri dev
```

### Mobile

`nix develop .#mobile` provides the Android and iOS toolchains; iOS also needs
Xcode. Connect the phone over USB, then:

```sh
bun run android:init
bun tauri android dev --host

bun run ios:init
APPLE_DEVELOPMENT_TEAM=<team id> bun tauri ios dev --host
```

## Releases

Pushing a `vX.Y.Z` tag builds the desktop installers and the Android APK into a
draft GitHub release, and uploads the mobile builds to TestFlight and Google
Play internal testing.

## License

[AGPL-3.0-or-later](LICENSE)
