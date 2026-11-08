# Stable config upgrade fixture

`config-v1.0.18.json` follows the complete persisted config schema in app tag
`v1.0.18` (`acc7c338f2dfb1d620b0086c1d4123ce0f45aa9e`), from
`src-tauri/src/models/config.rs`. It uses non-default workstation preferences,
keyboard/gamepad bindings, and a module-based custom action so a fallback to
current defaults cannot accidentally pass the upgrade test.

That stable schema has the fixed-overlay fields `overlayScale`,
`attitudeIndicator`, `workIndicator`, and `thrusterRpmOverlay`, not an overlay
layout. The native migration converts them directly into current widgets.
The active compatibility warning UI retains the stable
`dismissedCompatibilityWarnings` list. Detection settings and the new input
binding default when absent, while existing bindings and other settings are
preserved.

Grouped layout widget types, per-attitude `options.workIndicator`, and older
grid resolutions belonged only to intermediate release candidates. They are
not part of the supported stable-to-current upgrade path. Main intentionally
removed module-based custom actions: migration drops those
bindings, preserves capability action IDs and their inputs, and removes their
obsolete trigger field. Historical update-key cleanup remains.
