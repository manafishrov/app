#!/usr/bin/env python3
"""Sync the reviewed, hash-pinned model release catalog embedded in the app."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src-tauri/src/detection/catalog.json"
PIN = ROOT / "scripts/detection-catalog-pin.json"
RELEASES = "https://github.com/manafishrov/detection-models/releases/download"
MODEL_IDS = {
    "yolo26n", "yolo26s", "yolo26m", "yolo11n", "yolo11s",
    "marine-fishinv", "marine-megafauna",
}
MAX_CATALOG_BYTES = 1024 * 1024
MAX_MODEL_BYTES = 512 * 1024 * 1024


def validate_pin(pin: dict[str, str]) -> None:
    if re.fullmatch(r"v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)", pin["version"]) is None:
        raise ValueError("Pin must name an explicit stable release (vX.Y.Z)")
    if re.fullmatch(r"[0-9a-f]{64}", pin["sha256"]) is None:
        raise ValueError("Pin must contain the reviewed lowercase SHA-256")


def validate_catalog(data: bytes, pin: dict[str, str]) -> None:
    validate_pin(pin)
    if len(data) > MAX_CATALOG_BYTES:
        raise ValueError("Catalog exceeds the size limit")
    if hashlib.sha256(data).hexdigest() != pin["sha256"]:
        raise ValueError("Catalog SHA-256 does not match the reviewed pin")
    models = json.loads(data)
    if not isinstance(models, list) or len(models) != len(MODEL_IDS):
        raise ValueError("Catalog must contain the seven approved models")
    seen_ids: set[str] = set()
    seen_files: set[str] = set()
    for model in models:
        if not isinstance(model, dict) or model.get("id") not in MODEL_IDS:
            raise ValueError("Unknown model in catalog")
        if model["id"] in seen_ids:
            raise ValueError("Duplicate model ID")
        seen_ids.add(model["id"])
        for key in ("name", "license", "sourceUrl"):
            if not isinstance(model.get(key), str) or not model[key]:
                raise ValueError(f"Missing model {key}")
        if not model["sourceUrl"].startswith("https://"):
            raise ValueError("Model source must use HTTPS")
        if not isinstance(model.get("experimental"), bool):
            raise ValueError("Model experimental flag must be a boolean")
        upstream = model.get("upstreamAssetUrl")
        if upstream is not None and (not isinstance(upstream, str) or not upstream.startswith("https://")):
            raise ValueError("Upstream provenance must use HTTPS")
        asset = model.get("asset")
        if not isinstance(asset, dict):
            raise ValueError("Every model must have a pinned asset")
        filename = asset.get("fileName")
        if not isinstance(filename, str) or re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*\.onnx", filename) is None:
            raise ValueError("Invalid ONNX filename")
        if filename in seen_files:
            raise ValueError("Duplicate ONNX filename")
        seen_files.add(filename)
        size = asset.get("fileSize")
        if type(size) is not int or not 0 < size <= MAX_MODEL_BYTES:
            raise ValueError("Invalid model size")
        digest = asset.get("sha256")
        if not isinstance(digest, str) or re.fullmatch(r"[0-9a-f]{64}", digest) is None:
            raise ValueError("Invalid model SHA-256")
        if asset.get("url") != f"{RELEASES}/{pin['version']}/{filename}":
            raise ValueError("Model download must use the pinned Manafish release")


def synchronize(data: bytes, pin: dict[str, str], catalog: Path, pin_path: Path, *, check: bool) -> None:
    validate_catalog(data, pin)
    if check:
        if not pin_path.is_file() or json.loads(pin_path.read_bytes()) != pin:
            raise ValueError("Recorded catalog pin differs from the requested pin")
        if not catalog.is_file() or catalog.read_bytes() != data:
            raise ValueError("Embedded catalog differs from the pinned release; run sync")
    else:
        catalog.write_bytes(data)
        pin_path.write_text(json.dumps(pin, indent=2) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", help="explicit reviewed model release, e.g. v1.1.0")
    parser.add_argument("--sha256", help="reviewed SHA-256 of the exact release catalog bytes")
    parser.add_argument("--check", action="store_true", help="fail on release, local catalog, or pin drift; write nothing")
    parser.add_argument("--catalog", type=Path, help="read a local release catalog instead of fetching (offline verification)")
    args = parser.parse_args()
    if bool(args.version) != bool(args.sha256):
        parser.error("--version and --sha256 must be provided together")
    try:
        pin = {"version": args.version, "sha256": args.sha256} if args.version else json.loads(PIN.read_bytes())
        validate_pin(pin)
        if args.catalog:
            data = args.catalog.read_bytes()
        else:
            url = f"{RELEASES}/{pin['version']}/catalog.json"
            with urllib.request.urlopen(url, timeout=30) as response:
                data = response.read(MAX_CATALOG_BYTES + 1)
        synchronize(data, pin, CATALOG, PIN, check=args.check)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Catalog sync failed: {error}\n")
    print(f"{'Verified' if args.check else 'Synced'} detection catalog {pin['version']} ({pin['sha256']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
