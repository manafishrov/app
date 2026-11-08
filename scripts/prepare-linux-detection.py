#!/usr/bin/env python3
"""Stage one pinned ONNX Runtime core and its Linux GPU provider libraries.

Vendor drivers, CUDA/cuDNN, ROCm/MIGraphX and OpenVINO remain system runtimes.
The CPU core has no dependency on them. Requires a native C++ linker and patchelf.
"""

import argparse
import ctypes
import hashlib
import json
import lzma
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CDN = "https://cdn.pyke.io/0/pyke:ort-rs/ms@1.31.0/"
# Exact artifacts from ort-sys 2.0.0-rc.15 build/download/dist.tsv.
DISTRIBUTIONS = {
    "x86_64": {
        "cuda13,tensorrt,nvrtx": "535872087d5a5921aad090fdb46c65bb11c4c50b900dfcf6657ad3d5c465986f",
        "migraphx": "c48b89b76646c4ff15df9e75428cffaf9a990f8c1f6b164f2a3e6fb94c6b7abd",
        "openvino": "606d54fca76cbc77c0a1518c34691f8f00b7983c20775b5dca17bad68bdba990",
    },
    "aarch64": {
        "cuda13,tensorrt,nvrtx": "40c6f87b145b1fbe7df73f92c5ef3cbb886c6a45133ac1a3bd5177987ef72c75",
    },
}
NOTICES = {
    "LICENSE": "2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c",
    "ThirdPartyNotices.txt": "143764b952fdb1a7c69ce653bfba74a7744d6a8a573bfb73e235fba356c83de3",
}
LIBRARIES = {
    "libonnxruntime.a",
    "libonnxruntime_providers_shared.so",
    "libonnxruntime_providers_cuda.so",
    "libonnxruntime_providers_migraphx.so",
    "libonnxruntime_providers_openvino.so",
}


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def download(url, sha256, cache):
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / sha256
    if path.is_file() and digest(path) == sha256:
        return path
    with tempfile.NamedTemporaryFile(dir=cache, delete=False) as temporary:
        pending = Path(temporary.name)
        try:
            with urllib.request.urlopen(url, timeout=120) as response:
                shutil.copyfileobj(response, temporary)
            temporary.close()
            if digest(pending) != sha256:
                raise ValueError(f"SHA-256 mismatch for {url}")
            pending.replace(path)
        finally:
            pending.unlink(missing_ok=True)
    return path


def extract_libraries(archive, destination):
    # Never extract paths, links, directories or unrequested files from a tar.
    with lzma.open(archive, format=lzma.FORMAT_RAW,
                   filters=[{"id": lzma.FILTER_LZMA2, "dict_size": 1 << 26}]) as stream:
        with tarfile.open(fileobj=stream, mode="r|") as contents:
            for entry in contents:
                if entry.name not in LIBRARIES:
                    continue
                if not entry.isfile():
                    raise ValueError(f"Expected a regular library: {entry.name}")
                target = destination / entry.name
                with contents.extractfile(entry) as source:
                    data = source.read()
                # All providers must agree on the shared bridge ABI.
                if target.exists() and target.read_bytes() != data:
                    raise ValueError(f"Conflicting provider library: {entry.name}")
                target.write_bytes(data)


def check_core(path):
    """Fail packaging if the core cannot load without vendor GPU runtimes."""
    class ApiBase(ctypes.Structure):
        _fields_ = [("GetApi", ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.c_uint32)),
                    ("GetVersionString", ctypes.CFUNCTYPE(ctypes.c_char_p))]
    library = ctypes.CDLL(str(path))
    library.OrtGetApiBase.restype = ctypes.POINTER(ApiBase)
    api = library.OrtGetApiBase().contents
    if not api.GetVersionString().startswith(b"1.31.") or not api.GetApi(31):
        raise ValueError("The staged runtime does not provide ONNX Runtime 1.31 / API 31")


def prepare(arch, output, cache):
    distributions = DISTRIBUTIONS[arch]
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent, prefix=".detection-runtime-") as temporary:
        staging = Path(temporary)
        for feature, sha256 in distributions.items():
            url = f"{CDN}{arch}-unknown-linux-gnu+{feature}.tar.lzma2"
            print(f"Preparing ONNX Runtime 1.31.0: {feature}", flush=True)
            archive = download(url, sha256, cache)
            # Only the CUDA artifact supplies the core; other core archives can
            # differ because they were compiled with different provider flags.
            core = staging / "libonnxruntime.a"
            saved = core.read_bytes() if core.exists() else None
            if saved is not None:
                core.unlink()
            extract_libraries(archive, staging)
            if saved is not None:
                core.write_bytes(saved)
        exports = staging / "exports.map"
        exports.write_text("{ global: OrtGetApiBase; local: *; };\n")
        # The archive is PIC. Pull its API root and referenced objects, avoiding
        # --whole-archive (the upstream archive contains duplicate ONNX objects).
        subprocess.run([
            os.environ.get("CXX", "c++"), "-shared", "-Wl,-u,OrtGetApiBase",
            str(staging / "libonnxruntime.a"), "-o", str(staging / "libonnxruntime.so"),
            f"-Wl,--version-script={exports}", "-Wl,-soname,libonnxruntime.so",
            "-Wl,-z,defs", "-Wl,-z,noexecstack", "-pthread", "-ldl", "-lm",
        ], check=True)
        exports.unlink()
        (staging / "libonnxruntime.a").unlink()
        expected = {"libonnxruntime.so", "libonnxruntime_providers_shared.so", "libonnxruntime_providers_cuda.so"}
        if arch == "x86_64":
            expected.update({"libonnxruntime_providers_migraphx.so", "libonnxruntime_providers_openvino.so"})
        if {path.name for path in staging.iterdir()} != expected:
            raise ValueError("The pinned distribution is missing required libraries")
        for path in staging.glob("*.so"):
            subprocess.run(["patchelf", "--set-rpath", "$ORIGIN", str(path)], check=True)
        check_core(staging / "libonnxruntime.so")
        for name, sha256 in NOTICES.items():
            source = download(f"https://raw.githubusercontent.com/microsoft/onnxruntime/v1.31.0/{name}", sha256, cache)
            shutil.copyfile(source, staging / name)
        manifest = {"ort": "2.0.0-rc.15", "onnxruntime": "1.31.0", "arch": arch,
                    "distributions": distributions,
                    "files": {p.name: digest(p) for p in staging.iterdir()}}
        (staging / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        # Replace only files owned by this script after the complete build passes.
        output.mkdir(parents=True, exist_ok=True)
        for path in staging.iterdir():
            # Never truncate a shared library mapped by a running app.
            with tempfile.NamedTemporaryFile(dir=output, delete=False) as pending:
                temporary_path = Path(pending.name)
            try:
                shutil.copy2(path, temporary_path)
                temporary_path.replace(output / path.name)
            finally:
                temporary_path.unlink(missing_ok=True)
    print(f"Detection runtime staged in {output}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--arch", choices=DISTRIBUTIONS, default=platform.machine())
    parser.add_argument("--output", type=Path, default=ROOT / "src-tauri/detection-runtime")
    parser.add_argument("--cache", type=Path, default=ROOT / "target/detection-runtime-downloads")
    args = parser.parse_args()
    if platform.system() != "Linux" or args.arch != platform.machine():
        parser.error("Run on native x86_64/aarch64 Linux; cross-linking is not supported")
    prepare(args.arch, args.output, args.cache)


if __name__ == "__main__":
    main()
