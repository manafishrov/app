# Extensions V1

The desktop app and ROV firmware share one capability protocol for built-in and
extension readings/actions. Configuration import/export, firmware maintenance,
and local app features retain their existing APIs. The MCU protocol is unchanged.

## Ownership and workflow

The ROV stores Python sources, enablement, action trigger preferences, and CSVs.
The desktop stores widget layouts and keyboard/controller bindings referencing
stable capability IDs. Extension removal or temporary disconnection preserves
those local references and displays their unavailable state.

In **Custom actions**, prepare a script or copy the shared SDK/CSV instructions and
connected ROV's catalogue to an agent. Import its UTF-8 `.py` file or edit Python with syntax highlighting, then save
and enable it. Saving validates the current script before installation. Validation
prepares typed SDK declarations off the control event loop without invoking
registered work. Exact-source caching reuses the prepared module for save and
first enable. Imports time out after 10 seconds; an import that has not returned
prevents another from starting.
Editing invalidates that validation. Uninstalled drafts survive settings-page
navigation within the current app session. The only bundled action is the water
sensor: it reads GPIO17, publishes its wet/dry state, and shows the original
wet, dry, or read-error notification. Every reading updates its widget; repeated
identical readings do not repeat the notification. Its source is included in the
instructions accordion and copied SDK guide. Save it as a new custom action and
enable it to start monitoring; disable it to stop. Add **Water detected** in Appearance.
The **Toggle monitoring** action supports temporary pause/resume from an action
widget or keybind. Pausing clears the reading and stops GPIO sampling; script
reloads, app disconnects, and ROV restarts reset the pause.

In **Appearance**, custom readings and actions are available in the existing
widget gallery. Supported displays include text/numbers, badges, status and
warning lights, ping lights, horizontal/vertical bars, and action buttons.
Bindings live in **Keyboard** and **Controller**; trigger mode and repeat delay
are configured on the ROV in Custom actions. The ROV schedules repeats, and
operator work stops on disconnect. Only explicitly opted-in background work may
continue. See the embedded SDK guide for extension lifetime and state semantics.

**CSV logging** lists ROV files, downloads stable snapshots through the native
save dialog, and requires confirmation before deletion. Downloads validate each
chunk and replace the selected local file only after the full transfer succeeds.

## Shared interface

- `src/stores/capabilityTypes.ts`: versioned catalogue and sample validation.
- `src/stores/capabilities.ts`: one reading store, event sequencing, availability.
- `src/stores/capabilityProjection.ts`: typed views used by existing instruments.
- `src/tauri/capabilities.ts`: discovery, requests, action invocation, file dialogs.
- `src-tauri/src/websocket/capabilities.rs`: bounded request correlation,
  disconnect cancellation, and protocol validation.
- `src/features/settings/extensions/`: editor, instructions, and CSV management.
- `src/features/overlay/widgets/CapabilityWidget.tsx`: generic display renderer.

Wire envelopes are capabilityRequest, capabilityResponse, capabilityCatalog,
and capabilitySamples, all version 1. Action invocation uses a stable ID and
press/release/stop phase. Catalogue snapshots include current values, and sample
sequence numbers distinguish identical publications. Readings can be unavailable
(null) before data arrives or after a source fails. The public Python SDK is
`manafish_sdk` in the firmware repository. Scripts use `Script`, typed `Reading`
objects, and action/background decorators. The SDK derives catalogue metadata
from these declarations; scripts do not maintain a separate manifest dictionary. `Context.rov` references the actual
`RovState` instance, preserving its nested model types and live values. Trusted
extensions run as cooperative async tasks in the firmware process; they must
yield and honor cancellation. Python uses the existing objects and methods
directly, while capability IDs remain the app wire interface.

The firmware guide and example scripts are embedded in the app so copying
instructions works offline. When updating SDK semantics, update those assets and
the catalogue contract fixtures in both repositories together. No CLI, dependency
installer, script sandbox, or custom charts are included in V1.

## Compatibility and validation

App and firmware must both support protocol V1. This intentionally replaces the
legacy telemetry/status/custom-action wire messages. Upgrade the firmware and
app together while the vehicle is idle; do not operate an old app against the new
firmware. Existing app layouts and bindings for built-in controls are preserved.
Legacy manually named Python-module bindings remain unavailable until replaced
with bindings to installed SDK actions.

Run the quality gates in AGENTS.md, including mounted component tests. The
firmware catalogue fixture in `src/stores/fixtures/` exercises the actual wire
shape against the frontend parser. Native tests cover UTF-8 source preservation,
request cancellation, and CSV chunk validation. Firmware tests cover SDK tasks,
script faults, disconnects, trigger scheduling, persistence and CSV snapshots.
Real actuator/sensor drivers still require hardware-specific testing. The bundled
water sensor uses the original active-high input and wiring: signal on Pi pin 11
(GPIO17), power on pin 1 (3V3), and ground on pin 6. It samples continuously with a 250 ms delay between reads, marks readings stale
after two seconds, and continues without an app connection. Enabled monitoring
restarts with the ROV. GPIO failures stop the script and report an error.

## Python editor analysis

The editor connects CodeMirror to a bundled ty language server over Tauri IPC and
stdio. It runs on the PC and never executes the draft. Runtime validation remains
a separate operation when saving or enabling a script. Closing the editor stops
its process; analysis errors leave the editor usable and appear in Debug.

Run `bun run editor:prepare` before direct Cargo commands. Tauri dev/build hooks
do this automatically. The preparation script downloads a pinned, SHA-256-checked
upstream executable for the target platform; Python is a build dependency only.
Tauri packages and signs it as an external binary. The version and platform hashes
live in `scripts/prepare-python-editor.py`.

Firmware `sdk.describe` and `sdk.read` provide a content-addressed gzip snapshot
of actual Python source/type files, including installed runtime dependencies.
The native backend validates the hash, size limits, and paths before replacing
its SDK cache. Reconnection refreshes the editor session. Offline editing uses
the last successful snapshot with an explicit cached-types indicator; before the
first connection, only standard Python/local definitions can be resolved.

This source cache is analysis input, not a second SDK or a runtime proxy. Keep
completion derived from the actual definitions; do not add handwritten member
lists. Update firmware before the app to enable source synchronization.
