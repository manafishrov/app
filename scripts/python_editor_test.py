"""Verify language-server preparation without downloading executables."""

import importlib.util
import io
from pathlib import Path
import tarfile
import unittest
from unittest.mock import patch
import zipfile


spec = importlib.util.spec_from_file_location('prepare_editor', Path(__file__).with_name('prepare-python-editor.py'))
prepare_editor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare_editor)


class PythonEditorPackagingTest(unittest.TestCase):
    def test_supported_platforms_have_pinned_archive_hashes(self):
        self.assertEqual(len(prepare_editor.ARTIFACTS), 6)
        for target, (_, checksum) in prepare_editor.ARTIFACTS.items():
            with patch.dict('os.environ', {'TAURI_ENV_TARGET_TRIPLE': target}):
                self.assertEqual(prepare_editor.target_triple(), target)
            self.assertRegex(checksum, r'^[0-9a-f]{64}$')

    def test_only_expected_binary_is_read_from_unix_archive(self):
        archive = io.BytesIO()
        with tarfile.open(fileobj=archive, mode='w:gz') as package:
            member = tarfile.TarInfo('ty-x86_64-unknown-linux-musl/ty')
            member.size = 3
            package.addfile(member, io.BytesIO(b'ty!'))
            member = tarfile.TarInfo('../../ignored')
            member.size = 0
            package.addfile(member, io.BytesIO())
        self.assertEqual(prepare_editor.executable_bytes(archive.getvalue(), 'x86_64-unknown-linux-musl'), b'ty!')

    def test_windows_archive_needs_no_external_extractor(self):
        archive = io.BytesIO()
        with zipfile.ZipFile(archive, 'w') as package:
            package.writestr('ty.exe', b'ty!')
        self.assertEqual(prepare_editor.executable_bytes(archive.getvalue(), 'x86_64-pc-windows-msvc'), b'ty!')
