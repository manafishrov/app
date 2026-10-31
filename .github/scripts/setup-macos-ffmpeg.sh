#!/usr/bin/env bash
set -euo pipefail

# Runner images can disable automatic updates and retain an older formula index.
brew update
brew install ffmpeg@8
export FFMPEG_DIR="$(brew --prefix ffmpeg@8)"
export PKG_CONFIG_PATH="${FFMPEG_DIR}/lib/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
if [[ "$(pkg-config --modversion libavcodec)" != 62.* ]]; then
  echo "Expected FFmpeg 8 (libavcodec 62)" >&2
  exit 1
fi
printf 'FFMPEG_DIR=%s\nPKG_CONFIG_PATH=%s\n' "$FFMPEG_DIR" "$PKG_CONFIG_PATH" >> "$GITHUB_ENV"
for pkg in ffmpeg@8 $(brew deps ffmpeg@8); do
  pkg_lib="$(brew --prefix "$pkg")/lib"
  [ -d "$pkg_lib" ] || continue
  for dylib in "$pkg_lib"/*.dylib; do
    [ -L "$dylib" ] && continue
    [ -f "$dylib" ] || continue
    install_name_tool -id "@rpath/$(basename "$dylib")" "$dylib"
    for dep in $(otool -L "$dylib" | grep /opt/homebrew | awk '{print $1}'); do
      install_name_tool -change "$dep" "@rpath/$(basename "$dep")" "$dylib"
    done
  done
  cp -P "$pkg_lib"/*.dylib src-tauri/ 2>/dev/null || true
done
DYLIBS_JSON=$(ls src-tauri/*.dylib | sed 's|src-tauri/|./|' | sed 's|^|"|' | sed 's|$|"|' | tr '\n' ',' | sed 's/,$//')
bun -e "console.log(JSON.stringify({bundle: {macOS: {frameworks: [$DYLIBS_JSON]}}}))" > src-tauri/tauri.macos.conf.json
