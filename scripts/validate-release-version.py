#!/usr/bin/env python3
"""Validate that a release tag matches every embedded app version."""

from __future__ import annotations

import argparse
import json
import re
import tomllib
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
RELEASE_VERSION = re.compile(
    r"^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)"
    r"(?:-(?!rc(?:[.-]|$))[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*|-rc\.[1-9]\d*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)


def _load_toml(path: Path) -> dict[str, object]:
    with path.open("rb") as file:
        return tomllib.load(file)


def _package_version(path: Path, package_name: str) -> str:
    packages = _load_toml(path).get("package", [])
    for package in packages:
        if isinstance(package, dict) and package.get("name") == package_name:
            version = package.get("version")
            if isinstance(version, str):
                return version
    raise ValueError(f"{path} does not contain package {package_name!r}")


def embedded_versions() -> dict[str, str]:
    cargo = _load_toml(ROOT / "src-tauri" / "Cargo.toml")
    yolo = _load_toml(ROOT / "src-yolo" / "pyproject.toml")
    tauri = json.loads((ROOT / "src-tauri" / "tauri.conf.json").read_text())
    appstream = ElementTree.parse(
        ROOT / "src-tauri" / "com.manafishrov.manafish.metainfo.xml"
    )
    newest_release = appstream.find("./releases/release")
    if newest_release is None or newest_release.get("version") is None:
        raise ValueError("AppStream metadata has no release version")

    return {
        "src-tauri/Cargo.toml": str(cargo["package"]["version"]),
        "src-tauri/Cargo.lock": _package_version(
            ROOT / "src-tauri" / "Cargo.lock", "manafish"
        ),
        "src-tauri/tauri.conf.json": str(tauri["version"]),
        "src-tauri/com.manafishrov.manafish.metainfo.xml": newest_release.get(
            "version", ""
        ),
        "src-yolo/pyproject.toml": str(yolo["project"]["version"]),
        "src-yolo/uv.lock": _package_version(
            ROOT / "src-yolo" / "uv.lock", "manafish"
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("tag", help="release tag, with or without the v prefix")
    args = parser.parse_args()

    version = args.tag.removeprefix("v")
    if RELEASE_VERSION.fullmatch(version) is None:
        parser.error(
            f"{args.tag!r} is not canonical SemVer; release candidates use x.y.z-rc.N"
        )
    prerelease = version.partition("-")[2].partition("+")[0]
    if prerelease.lower().startswith("rc") and re.fullmatch(
        r"rc\.[1-9]\d*", prerelease
    ) is None:
        parser.error(
            f"{args.tag!r} is not canonical SemVer; release candidates use x.y.z-rc.N"
        )

    mismatches = {
        path: embedded
        for path, embedded in embedded_versions().items()
        if embedded != version
    }
    if mismatches:
        details = "\n".join(
            f"  {path}: {embedded!r}" for path, embedded in mismatches.items()
        )
        parser.error(f"tag version {version!r} does not match:\n{details}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
