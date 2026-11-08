"""Offline checks for the app's explicitly pinned catalog sync."""

import copy
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("sync-detection-catalog.py")
SPEC = importlib.util.spec_from_file_location("catalog_sync", SCRIPT)
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)


class CatalogSyncTests(unittest.TestCase):
    def setUp(self):
        self.data = sync.CATALOG.read_bytes()
        self.pin = json.loads(sync.PIN.read_bytes())
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.catalog = Path(self.directory.name) / "catalog.json"
        self.pin_path = Path(self.directory.name) / "pin.json"

    def synchronize(self, *, data=None, pin=None, check=False):
        sync.synchronize(
            self.data if data is None else data,
            self.pin if pin is None else pin,
            self.catalog,
            self.pin_path,
            check=check,
        )

    def test_embedded_catalog_matches_reviewed_pin(self):
        sync.synchronize(self.data, self.pin, sync.CATALOG, sync.PIN, check=True)

    def test_sync_records_exact_bytes_and_pin_and_check_writes_nothing(self):
        self.synchronize()
        self.assertEqual(self.catalog.read_bytes(), self.data)
        self.assertEqual(json.loads(self.pin_path.read_bytes()), self.pin)
        before = (self.catalog.stat().st_mtime_ns, self.pin_path.stat().st_mtime_ns)
        self.synchronize(check=True)
        self.assertEqual(before, (self.catalog.stat().st_mtime_ns, self.pin_path.stat().st_mtime_ns))

    def test_check_rejects_local_drift_without_repairing_it(self):
        self.synchronize()
        changed = self.data + b"\n"
        self.catalog.write_bytes(changed)
        with self.assertRaisesRegex(ValueError, "Embedded catalog differs"):
            self.synchronize(check=True)
        self.assertEqual(self.catalog.read_bytes(), changed)

    def test_hash_mismatch_never_changes_existing_files(self):
        self.synchronize()
        with self.assertRaisesRegex(ValueError, "SHA-256 does not match"):
            self.synchronize(data=self.data + b"\n")
        self.assertEqual(self.catalog.read_bytes(), self.data)
        self.assertEqual(json.loads(self.pin_path.read_bytes()), self.pin)

    def test_check_rejects_pin_drift(self):
        self.synchronize()
        self.pin_path.write_text(json.dumps({**self.pin, "version": "v1.0.0"}))
        with self.assertRaisesRegex(ValueError, "Recorded catalog pin differs"):
            self.synchronize(check=True)

    def test_pin_rejects_mutable_versions_and_invalid_digests(self):
        for version in ("latest", "main", "v1.1.0-rc.1", "v01.1.0", "v1.1.0/../main"):
            with self.subTest(version=version), self.assertRaises(ValueError):
                sync.validate_pin({**self.pin, "version": version})
        with self.assertRaises(ValueError):
            sync.validate_pin({**self.pin, "sha256": "not-a-hash"})

    def test_rejects_invalid_catalog_even_with_a_matching_digest(self):
        models = json.loads(self.data)
        cases = []
        for key, value in (
            ("fileName", "../model.onnx"),
            ("fileSize", 0),
            ("fileSize", True),
            ("fileSize", sync.MAX_MODEL_BYTES + 1),
            ("sha256", "not-a-hash"),
            ("url", "https://github.com/ultralytics/assets/releases/latest/model.onnx"),
        ):
            changed = copy.deepcopy(models)
            changed[0]["asset"][key] = value
            cases.append(changed)
        changed = copy.deepcopy(models)
        changed[0]["upstreamAssetUrl"] = "http://example.org/model.onnx"
        cases.extend((changed, models[:-1], [models[0]] * len(models), {"models": models}))
        changed = copy.deepcopy(models)
        changed[0]["id"] = "unreviewed-model"
        cases.append(changed)
        for index, candidate in enumerate(cases):
            data = json.dumps(candidate).encode()
            pin = {**self.pin, "sha256": hashlib.sha256(data).hexdigest()}
            with self.subTest(case=index), self.assertRaises(ValueError):
                self.synchronize(data=data, pin=pin)
            self.assertFalse(self.catalog.exists())
            self.assertFalse(self.pin_path.exists())


if __name__ == "__main__":
    unittest.main()
