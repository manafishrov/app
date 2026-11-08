import hashlib
import importlib.util
import io
import lzma
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "prepare_linux_detection", Path(__file__).with_name("prepare-linux-detection.py")
)
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class LinuxDetectionRuntimeTests(unittest.TestCase):
    def archive(self, directory, entries):
        buffer = io.BytesIO()
        with tarfile.open(fileobj=buffer, mode="w") as archive:
            for name, payload in entries:
                entry = tarfile.TarInfo(name)
                entry.size = len(payload)
                archive.addfile(entry, io.BytesIO(payload))
        path = directory / "archive"
        path.write_bytes(lzma.compress(buffer.getvalue(), format=lzma.FORMAT_RAW,
                                     filters=[{"id": lzma.FILTER_LZMA2, "dict_size": 1 << 26}]))
        return path

    def test_extracts_only_exact_libraries_without_following_tar_paths(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "out"
            output.mkdir()
            archive = self.archive(root, [
                ("../escape", b"bad"),
                ("/absolute", b"bad"),
                ("libonnxruntime_providers_tensorrt.so", b"unused"),
                ("libonnxruntime_providers_cuda.so", b"cuda"),
            ])
            prepare.extract_libraries(archive, output)
            self.assertEqual([p.name for p in output.iterdir()], ["libonnxruntime_providers_cuda.so"])
            self.assertEqual((output / "libonnxruntime_providers_cuda.so").read_bytes(), b"cuda")
            self.assertFalse((root / "escape").exists())

    def test_rejects_conflicting_shared_bridges(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "libonnxruntime_providers_shared.so").write_bytes(b"one")
            archive = self.archive(root, [("libonnxruntime_providers_shared.so", b"two")])
            with self.assertRaisesRegex(ValueError, "Conflicting provider"):
                prepare.extract_libraries(archive, root)

    def test_accepts_identical_shared_bridges(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "libonnxruntime_providers_shared.so").write_bytes(b"same")
            archive = self.archive(root, [("libonnxruntime_providers_shared.so", b"same")])
            prepare.extract_libraries(archive, root)

    def test_rejects_corrupt_download_without_caching_it(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            expected = hashlib.sha256(b"expected").hexdigest()
            with patch.object(prepare.urllib.request, "urlopen", return_value=io.BytesIO(b"corrupt")):
                with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
                    prepare.download("https://example.invalid/runtime", expected, root)
            self.assertEqual(list(root.iterdir()), [])

    def test_rechecks_cached_bytes_before_using_them(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            expected = hashlib.sha256(b"good").hexdigest()
            (root / expected).write_bytes(b"corrupt")
            with patch.object(prepare.urllib.request, "urlopen", return_value=io.BytesIO(b"good")):
                result = prepare.download("https://example.invalid/runtime", expected, root)
            self.assertEqual(result.read_bytes(), b"good")


if __name__ == "__main__":
    unittest.main()
