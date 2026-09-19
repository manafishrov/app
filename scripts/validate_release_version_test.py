"""Release identities stay strict when uv normalizes release candidates."""

import contextlib
import importlib.util
import io
import unittest
from pathlib import Path
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "release_version", Path(__file__).with_name("validate-release-version.py")
)
assert SPEC is not None and SPEC.loader is not None
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)

PATHS = (
    "src-tauri/Cargo.toml",
    "src-tauri/Cargo.lock",
    "src-tauri/tauri.conf.json",
    "src-tauri/com.manafishrov.manafish.metainfo.xml",
    "src-yolo/pyproject.toml",
    "src-yolo/uv.lock",
)
VERSION = "1.0.18-rc.1"


class ReleaseVersionTests(unittest.TestCase):
    def validate(self, tag, versions):
        with (
            patch("sys.argv", ["validate-release-version.py", tag]),
            patch.object(validator, "embedded_versions", return_value=versions),
        ):
            return validator.main()

    def assert_rejected(self, tag, versions):
        with contextlib.redirect_stderr(io.StringIO()) as errors:
            with self.assertRaises(SystemExit) as raised:
                self.validate(tag, versions)
        self.assertEqual(raised.exception.code, 2)
        return errors.getvalue()

    def test_exact_identity_in_all_six_files(self):
        for version in ("1.0.18", VERSION, "1.0.18-rc.12", "1.0.18-rc.1+build.4"):
            for prefix in ("", "v"):
                with self.subTest(version=version, prefix=prefix):
                    self.assertEqual(
                        self.validate(prefix + version, dict.fromkeys(PATHS, version)), 0
                    )

    def test_uv_generated_rc_spelling_is_accepted(self):
        for number in (1, 12):
            version = f"1.0.18-rc.{number}"
            versions = dict.fromkeys(PATHS, version)
            versions["src-yolo/uv.lock"] = f"1.0.18rc{number}"
            self.assertEqual(self.validate("v" + version, versions), 0)

    def test_normalization_is_not_allowed_in_other_metadata(self):
        for path in PATHS[:-1]:
            with self.subTest(path=path):
                versions = dict.fromkeys(PATHS, VERSION)
                versions[path] = "1.0.18rc1"
                self.assertIn(path, self.assert_rejected(VERSION, versions))

    def test_every_file_still_checks_the_real_version(self):
        for path in PATHS:
            for wrong in ("1.0.17-rc.1", "1.0.18-rc.2", "1.0.18", "1.0.19"):
                with self.subTest(path=path, wrong=wrong):
                    versions = dict.fromkeys(PATHS, VERSION)
                    versions[path] = wrong
                    self.assertIn(path, self.assert_rejected(VERSION, versions))

    def test_uv_mismatches_and_lossy_normalizations_are_rejected(self):
        for wrong in (
            "1.0.17rc1", "1.0.18rc2", "1.0.18rc01", "1.0.18a1", "1.0.18b1",
            "1.0.18rc1.dev1", "1.0.18rc1.post1", "1.0.18rc1+build.4",
            "1.0.18rc1\n", "1!1.0.18rc1", "1.0.18",
        ):
            with self.subTest(wrong=wrong):
                versions = dict.fromkeys(PATHS, VERSION)
                versions["src-yolo/uv.lock"] = wrong
                self.assertIn("src-yolo/uv.lock", self.assert_rejected(VERSION, versions))
        versions = dict.fromkeys(PATHS, VERSION + "+build.4")
        versions["src-yolo/uv.lock"] = "1.0.18rc1"
        self.assert_rejected(VERSION + "+build.4", versions)

    def test_noncanonical_tags_remain_rejected(self):
        for tag in ("1.0.18rc1", "1.0.18-rc.01", "1.0.18-rc1", "1.0.18-rc.0"):
            with self.subTest(tag=tag):
                self.assert_rejected(tag, dict.fromkeys(PATHS, tag))


if __name__ == "__main__":
    unittest.main()
