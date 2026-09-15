# Pico attitude migration: app handoff

Branch: `feat/pico-spi-attitude-500hz`.

The app retains its existing controls, settings forms, attitude overlays,
calibration/manual thruster tests, and MCU/ESC/SD flashing workflows. Only the
configuration response contract and its timeout changed in production code.

## Configuration apply contract

1. Settings and imports use `src/tauri/rovConfig.ts`. It serializes mutations,
   assigns a `mutationId`, and invokes the existing Rust command.
2. Rust forwards `setConfig` or `importConfig`. Successful transport delivery
   does not confirm that Pico applied anything.
3. Pi must finish the actual Pico apply transaction and persistence before
   returning the canonical `config` response with the same `mutationId`.
4. A successful response updates the app store, runs the existing
   `beforeConfirm` callback (used for connection changes), then sends
   `confirmConfig`. The app does not create a settings success toast here.
5. Pi sends its existing translated success toast after confirmation. The
   existing toast listener renders it and plays the settings confirmation haptic.

Rejected mutations use the approved additive response field:

```json
{
  "type": "config",
  "payload": {
    "mutationId": "request-id",
    "config": "the complete canonical current configuration object",
    "error": "Pico apply ACK timed out"
  }
}
```

The `config` string above is a placeholder for the unchanged configuration
object schema. Success omits `error`. Rust preserves the optional error in the
Tauri event. On a matching error response, the app displays canonical state but
rejects the pending promise without running `beforeConfirm`, sending
`confirmConfig`, or creating a success toast/haptic. Pi's translated warning
remains responsible for user-facing failure text.

The configuration-only response timeout is now 12 seconds, allowing Pi's
8-second apply budget plus persistence and response delivery. Other request
and loading-toast timeouts are unchanged. Missing responses reject locally;
late, unrelated, or duplicate responses cannot confirm another pending
mutation. As before, remote canonical responses still update the displayed
configuration even when their mutation ID has no waiter.

## Audit findings and unchanged behavior

- Power, regulator/turn rates/FPV mode, direction coefficients, allocation,
  nullspace, thruster mapping/spin, protocol/speed, and configuration import use
  the same confirmed configuration pipeline. Their exposed controls and value
  schemas are unchanged. Pico ownership/forwarding remains a Pi responsibility.
- MCU board/protocol handling and flashing sequencing remain unchanged. The
  existing connection-specific `beforeConfirm` ordering remains intact.
- Thruster tests still end only on terminal firmware toasts, not local loading
  timeout or cancel enqueue success. Existing calibration Escape/cancel and
  serialization tests remain in the full suite.
- `websocket/receive.rs` forwards telemetry and log events without rate limiting.
  `src/tauri/rovTelemetry.ts` updates the existing reactive store for every
  received sample. Existing attitude overlays consume actual and desired
  pitch/roll/yaw from that store. There is no new plot or UI component.
- `src/tauri/logs.ts` sends firmware info entries through the existing persistent
  log recorder. The Pi owns the five-second summary cadence; the app does not
  synthesize frequency reports or add a timer.

## Validation

All repository quality gates pass:

- `bun run fmt:check`
- `bun run lint` (no warnings)
- `bun run fmt:rs:check`
- `bun run lint:rs`
- `bun run test`: 29 files, 184 tests
- Additional `cargo test --manifest-path src-tauri/Cargo.toml`: 45 tests
- `git diff --check`

Rust commands ran in the repository's Nix development shell. Fresh-worktree
setup used `bun install --frozen-lockfile` and generated ignored Paraglide
outputs with `bunx paraglide-js compile --project ./i18n.inlang --outdir
./src/paraglide --emit-ts-declarations` before frontend gates.

New coverage checks Pico-owned settings forwarding without optimistic state,
8-second apply tolerance, 12-second lost-response rejection, negative ACKs,
empty error strings, stale success/rejection after timeout, duplicate responses,
final confirmation send failure, and no success toast/haptic from configuration
responses. One Pi success toast produces one haptic, without an extra local one.
Rust tests verify successful legacy responses and error responses survive the
websocket-to-event serialization boundary.

Synthetic delivery tests check every actual/desired sample in a 60 Hz sequence
and repeated firmware info entries spaced five seconds apart. These prove app
routing, not real transport throughput, UI frame rate, Pico 500 Hz timing,
pressure 15 Hz timing, or hardware apply correctness. Hardware and end-to-end
validation remain with the coordinating agent.

## Pairing and rollout

Land/use this app before enabling the new Pi rejection responses. This app
accepts an old Pi response without `error`, but cannot make old firmware enforce
Pico ACK semantics. An old app ignores the new rejection field and may resolve a
rejected operation as successful. The complete safety requirement therefore
needs this app plus the paired Pi/Pico implementation. Parent coordination owns
Pi/Pico deployment order and hardware checks.

No hardware access, push, PR, release, or deployment was performed.
