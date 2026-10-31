"""Bundle a checksum-pinned ty binary; Python is needed only by app developers."""

import hashlib
import io
import json
import os
from pathlib import Path
import platform
import tarfile
import urllib.request
import zipfile


VERSION = "0.0.38"
ARTIFACTS = {
    "x86_64-unknown-linux-gnu": ("x86_64-unknown-linux-musl", "69824a89a4b2a853bef048bf254b17308d0e00c7299867b3c2e439ff691c624c"),
    "aarch64-unknown-linux-gnu": ("aarch64-unknown-linux-musl", "c5e360984812acc4e04351d100a68205310e99fe5fd0a3234973f337b5498bf0"),
    "x86_64-apple-darwin": ("x86_64-apple-darwin", "99ac670c5e9477838bb01c49f9f3acc1cd7b0b9f0daf7244930bb2285871e845"),
    "aarch64-apple-darwin": ("aarch64-apple-darwin", "af33e9a1447e4cbb4069451f84bcd0e64ef99b3815b36721af91a6ff5ab9f26f"),
    "x86_64-pc-windows-msvc": ("x86_64-pc-windows-msvc", "dfeeb0bbd8ed47c3366f47ab421e5fef3738d20170843e18ae9ce91d58b9f5cf"),
    "aarch64-pc-windows-msvc": ("aarch64-pc-windows-msvc", "f6e4ca670fe9b26b279092c2363dc175c048585db1faeb2191af862b16a57906"),
}


def target_triple():
    if target := os.environ.get("TAURI_ENV_TARGET_TRIPLE"):
        return target
    architecture = {"x86_64": "x86_64", "AMD64": "x86_64", "arm64": "aarch64", "aarch64": "aarch64"}[platform.machine()]
    system = {"Linux": "unknown-linux-gnu", "Darwin": "apple-darwin", "Windows": "pc-windows-msvc"}[platform.system()]
    return f"{architecture}-{system}"


def executable_bytes(archive, target):
    """Read only the expected binary; never extract archive paths onto disk."""
    if "windows" in target:
        with zipfile.ZipFile(io.BytesIO(archive)) as package:
            return package.read("ty.exe")
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as package:
        member = package.getmember(f"ty-{target}/ty")
        if not member.isfile():
            raise ValueError("ty archive contains a non-file executable")
        with package.extractfile(member) as executable:
            return executable.read()


def prepare():
    target = target_triple()
    release_target, digest = ARTIFACTS[target]
    root = Path(__file__).resolve().parents[1] / "src-tauri/binaries"
    root.mkdir(parents=True, exist_ok=True)
    suffix = ".exe" if "windows" in target else ""
    executable = root / f"manafish-python-analysis-{target}{suffix}"
    stamp = root / f"{target}.json"
    if executable.is_file() and stamp.is_file():
        previous = json.loads(stamp.read_text())
        if previous.get("version") == VERSION and previous.get("sha256") == hashlib.sha256(executable.read_bytes()).hexdigest():
            return
    extension = "zip" if suffix else "tar.gz"
    url = f"https://github.com/astral-sh/ty/releases/download/{VERSION}/ty-{release_target}.{extension}"
    with urllib.request.urlopen(url, timeout=60) as response:
        archive = response.read()
    if hashlib.sha256(archive).hexdigest() != digest:
        raise ValueError("ty archive checksum mismatch")
    binary = executable_bytes(archive, release_target)
    temporary = executable.with_suffix(".download")
    temporary.write_bytes(binary)
    temporary.chmod(0o755)
    temporary.replace(executable)
    stamp.write_text(json.dumps({"version": VERSION, "sha256": hashlib.sha256(binary).hexdigest()}))


if __name__ == "__main__":
    prepare()
