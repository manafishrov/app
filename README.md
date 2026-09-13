# Manafish App

Control application for the Manafish ROV built with [Tauri](https://tauri.app), [SolidJS](https://solidjs.com), and Rust.

## Current display

Current is the sum of two MCU-calibrated board readings above idle. The MCU
owns the fixed two-board shared-sensor layout; there is no per-motor/shared-bus
setting. Auto-zero does not support other sensor layouts or validate sensor gain.
Missing calibration or telemetry is shown as `— A`, not zero. No offset or
board averaging is applied in the app.

Install this nullable-current-capable app before the matching Pi firmware.
Legacy Pi status with numeric current remains readable, but still represents
its legacy current calculation. The new estimate is not absolute battery current
or overcurrent protection.

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

## License

This project is licensed under the GNU Affero General Public License v3.0 or later - see the [LICENSE](LICENSE) file for details.
