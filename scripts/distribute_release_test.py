"""Store tokens must verify and release notes must fit each store."""

import base64
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch


SPEC = importlib.util.spec_from_file_location(
    "distribute_release", Path(__file__).with_name("distribute-release.py")
)
assert SPEC is not None and SPEC.loader is not None
distribute = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(distribute)

TAG = "v1.1.0-rc.9"
URL = f"https://github.com/manafishrov/app/releases/tag/{TAG}"


def _decode(part: str) -> bytes:
    return base64.urlsafe_b64decode(part + "=" * (-len(part) % 4))


def _raw_to_der(raw: bytes) -> bytes:
    def integer(value: bytes) -> bytes:
        value = value.lstrip(b"\0") or b"\0"
        if value[0] & 0x80:
            value = b"\0" + value
        return bytes([0x02, len(value)]) + value

    body = integer(raw[:32]) + integer(raw[32:])
    return bytes([0x30, len(body)]) + body


def _openssl(*args: str) -> None:
    subprocess.run(["openssl", *args], check=True, capture_output=True)


class ReleaseNotesTests(unittest.TestCase):
    def test_keeps_notes_that_fit(self):
        self.assertEqual(distribute.release_notes(" Fixes toasts. \n", TAG, 500), "Fixes toasts.")

    def test_links_the_release_without_notes(self):
        self.assertEqual(distribute.release_notes("", TAG, 500), f"{TAG}: {URL}")

    def test_cuts_long_notes_at_a_sentence(self):
        notes = "First sentence. " + "word " * 200 + "end."
        result = distribute.release_notes(notes, TAG, 500)
        self.assertEqual(result, f"First sentence. Full notes: {URL}")

    def test_cuts_long_notes_without_sentences(self):
        result = distribute.release_notes("word " * 200, TAG, 500)
        self.assertEqual(len(result), 500)
        self.assertTrue(result.endswith(f"… Full notes: {URL}"))


class RequestTests(unittest.TestCase):
    def send(self, **kwargs):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"ok": true}'
        with patch("urllib.request.urlopen", return_value=response) as urlopen:
            self.assertEqual(distribute.request("POST", "https://store", "TOKEN", **kwargs), {"ok": True})
        return urlopen.call_args.args[0]

    def test_sends_json_bodies(self):
        sent = self.send(body={"track": "beta"})
        self.assertEqual(sent.get_header("Content-type"), "application/json")
        self.assertEqual(sent.get_header("Authorization"), "Bearer TOKEN")
        self.assertEqual(json.loads(sent.data), {"track": "beta"})

    def test_sends_forms(self):
        sent = self.send(form={"grant_type": "jwt", "assertion": "a.b.c"})
        self.assertEqual(sent.get_header("Content-type"), "application/x-www-form-urlencoded")
        self.assertEqual(sent.data, b"grant_type=jwt&assertion=a.b.c")


class StoreVersionTests(unittest.TestCase):
    def test_strips_prerelease_and_build(self):
        self.assertEqual(distribute.store_version("v1.1.0-rc.5+2"), "1.1.0")
        self.assertEqual(distribute.store_version("v1.0.18"), "1.0.18")


class DerSignatureTests(unittest.TestCase):
    def test_pads_short_and_strips_sign_bytes(self):
        r = b"\x00" + b"\x80" + b"\x01" * 31
        s = b"\x7f" * 31
        der = bytes([0x30, 2 + len(r) + 2 + len(s), 0x02, len(r)]) + r + bytes([0x02, len(s)]) + s
        self.assertEqual(
            distribute.der_signature_to_raw(der),
            b"\x80" + b"\x01" * 31 + b"\x00" + b"\x7f" * 31,
        )


class JwtTests(unittest.TestCase):
    def verify(self, algorithm: str, keygen: list[str], to_der) -> None:
        with tempfile.TemporaryDirectory() as directory:
            key = Path(directory, "key.pem")
            public = Path(directory, "public.pem")
            signature = Path(directory, "signature")
            _openssl("genpkey", *keygen, "-out", str(key))
            _openssl("pkey", "-in", str(key), "-pubout", "-out", str(public))

            token = distribute.jwt(algorithm, {"kid": "KEYID"}, {"aud": "store"}, key.read_text())
            header, claims, raw = token.split(".")

            self.assertEqual(json.loads(_decode(header)), {"alg": algorithm, "kid": "KEYID"})
            self.assertEqual(json.loads(_decode(claims)), {"aud": "store"})
            signature.write_bytes(to_der(_decode(raw)))
            subprocess.run(
                ["openssl", "dgst", "-sha256", "-verify", str(public), "-signature", str(signature)],
                input=f"{header}.{claims}".encode(),
                check=True,
                capture_output=True,
            )

    def test_es256_verifies(self):
        self.verify("ES256", ["-algorithm", "EC", "-pkeyopt", "ec_paramgen_curve:P-256"], _raw_to_der)

    def test_rs256_verifies(self):
        self.verify("RS256", ["-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048"], lambda raw: raw)


if __name__ == "__main__":
    unittest.main()
