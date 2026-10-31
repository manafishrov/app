# Manafish App

Control application for the Manafish ROV built with [Tauri](https://tauri.app), [SolidJS](https://solidjs.com), and Rust.

## Custom actions and CSV logging

Create or import Python scripts in **Settings → Custom actions**. The firmware
installs the Water sensor, Blackbox logging, and Extended telemetry scripts
disabled; enable them there and open them as examples. The instructions accordion
contains the SDK guide; **Copy instructions** also includes the connected ROV's
available readings and actions. Scripts and their enablement/trigger settings are
stored on the ROV. Choose widgets in Appearance and bindings in Keyboard or
Controller. Download recordings from CSV logging.

This branch requires matching capability protocol V1 firmware. Upgrade firmware
first, then use the matching app before operating the vehicle. The MCU protocol is
unchanged.

The Python editor uses bundled ty for completion and diagnostics without executing
drafts. Connect to the ROV to fetch actual SDK types; cached types work offline.
Python 3 is needed to prepare the language server during development/builds, but
users do not need Python installed. Tauri dev/build commands prepare it automatically;
run `bun run editor:prepare` before invoking Cargo directly.

## Current display

Current is the sum of two MCU-calibrated board readings above idle. The MCU
owns the fixed two-board shared-sensor layout; there is no per-motor/shared-bus
setting. Auto-zero does not support other sensor layouts or validate sensor gain.
Missing calibration or telemetry is shown as `— A`, not zero. No offset or
board averaging is applied in the app.

The estimate is not absolute battery current or overcurrent protection. Follow
the capability-protocol upgrade order above for this branch.

## Logs

The debug viewer displays pages of up to 500 records. Search and filters apply
only to the current page; older pages pause live display until returning to
Latest logs. Export captures all records still stored, regardless of the viewer.
It never runs retention cleanup or resets the database on a read failure.

Logs retain the seven-day age policy. Successful writes schedule background
cleanup, at most once per hour after a sweep finishes. Each transaction deletes
at most 200 expired records through the timestamp index, with a one-second delay
before the first batch and between batches. Viewer reads and writes do not await
cleanup. Expired records can remain until maintenance catches up; a failed sweep
waits for a later write after the hourly cooldown rather than resetting storage.

## Prerequisites

- [Bun](https://bun.sh)
- [Rust](https://www.rust-lang.org/tools/install)
- Python 3 (build tooling only)

## Setup

```bash
bun install
```

## Development

```bash
bun run tauri dev
```

## Build

```bash
bun run tauri build
```

## Mobile (Android and iOS)

The same app builds for Android and iOS phones and tablets. Mobile builds add
on-screen sticks (hidden while the selected gamepad is connected), lock to landscape and
keep the screen awake while open. Native code (game controllers, file pickers,
the ethernet route to the ROV) lives in the `src-tauri/plugins/mobile` Tauri
plugin, so the generated `src-tauri/gen/android` and `src-tauri/gen/apple`
projects are not committed; recreate them with the init scripts below.

Differences from desktop:

- Connect the ROV through a USB-C ethernet adapter. Android routes the app over
  the ethernet network that contains the ROV address, so other apps keep using
  Wi-Fi, but the app itself has no internet while tethered.
- Recordings are copied to a folder picked in the system file picker, or by
  default to Movies/Manafish (Android) or the app's folder in the Files app
  (iOS). They keep the recorder's container; there is no MP4 remux.
- Logs, CSV files and ROV config backups are saved through the system export
  sheet.
- Custom-action scripts can be edited, but Python completion and checking are
  desktop-only.
- No in-app updater or SD-card flashing.

### Android

Requires the Android SDK and NDK, JDK 17 and rustup. On Nix, `nix develop .#android`
provides all of them.

```bash
bun run android:init
bun tauri android dev
```

### iOS

Requires macOS with Xcode, XcodeGen and rustup.

```bash
bun run ios:init
bun tauri ios dev
```

### Releases

Release tags also attach `Manafish_<version>_android_aarch64.apk` and
`Manafish_<version>_ios_unsigned.ipa`. The APK is signed with the release
keystore from the `ANDROID_KEYSTORE` (base64), `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` secrets; keep the keystore safe,
since installed apps only accept updates signed with the same key. The IPA is
unsigned, so install it with a tool that signs it for your device, such as
AltStore or Sideloadly.

## Scripts

| Script                 | Description                  |
| ---------------------- | ---------------------------- |
| `bun run dev`          | Start Vite dev server        |
| `bun run build`        | Build frontend               |
| `bun run lint`         | Lint TypeScript              |
| `bun run lint:fix`     | Lint and auto-fix TypeScript |
| `bun run fmt`          | Format TypeScript            |
| `bun run fmt:check`    | Check TypeScript formatting  |
| `bun run lint:rs`      | Lint Rust                    |
| `bun run lint:rs:fix`  | Lint and auto-fix Rust       |
| `bun run fmt:rs`       | Format Rust                  |
| `bun run fmt:rs:check` | Check Rust formatting        |
| `bun run android:init` | Generate the Android project |
| `bun run ios:init`     | Generate the Xcode project   |

## License

This project is licensed under the GNU Affero General Public License v3.0 or later - see the [LICENSE](LICENSE) file for details.
