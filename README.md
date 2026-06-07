# Manafish App

Control application for the Manafish ROV built with [Tauri](https://tauri.app), [SolidJS](https://solidjs.com), and Rust.

## Prerequisites

- [Bun](https://bun.sh)
- [Rust](https://www.rust-lang.org/tools/install)

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

## Installing on Linux

The video stream uses WebRTC via WebKitGTK, which needs the GStreamer WebRTC
plugins (incl. the libnice ICE agent) and an H.264 decoder at runtime.

The `.deb` and `.rpm` packages declare these as dependencies, so `apt`/`dnf`
install them automatically. The `.AppImage` uses the host system's libraries —
if the stream stays black, install the plugins manually:

- **Debian / Ubuntu / Mint:**

  ```bash
  sudo apt install gstreamer1.0-plugins-good gstreamer1.0-plugins-bad \
    gstreamer1.0-libav gstreamer1.0-nice
  ```

- **Fedora:** `gstreamer1-libav` (the H.264 decoder) lives in RPM Fusion, so it
  is not a hard package dependency. Enable [RPM Fusion](https://rpmfusion.org)
  and install:

  ```bash
  sudo dnf install gstreamer1-plugins-good gstreamer1-plugins-bad-free \
    libnice-gstreamer1 gstreamer1-libav
  ```

## License

This project is licensed under the GNU Affero General Public License v3.0 or later - see the [LICENSE](LICENSE) file for details.
