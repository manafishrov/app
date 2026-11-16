#!/usr/bin/env python3
"""Hand a published release's mobile builds to external testers.

The release build uploads each build to Play internal testing and TestFlight.
Once the GitHub release is published, this promotes the same build to Play
closed and open testing, and gives it to every TestFlight group with an
external beta review submission. The release notes become the "What's new" and
"What to Test" text. Every step is safe to repeat, so a failed run can simply
be re-run.

Reads TAG, RELEASE_NOTES and BUILD_NUMBER from the environment, plus
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON for `play` and APPLE_API_KEY,
APPLE_API_ISSUER and APPLE_API_KEY_P8 for `testflight`.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


APP_ID = "com.manafishrov.manafish"
RELEASES_URL = "https://github.com/manafishrov/app/releases/tag"
PLAY_API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"
PLAY_TRACKS = ("alpha", "beta")
PLAY_NOTES_LIMIT = 500
APPLE_API = "https://api.appstoreconnect.apple.com/v1"
TESTFLIGHT_NOTES_LIMIT = 4000
POLL_INTERVAL_SECONDS = 30
PROCESSING_TIMEOUT_SECONDS = 60 * 60


def _base64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def store_version(tag: str) -> str:
    """Stores take a plain version: `v1.1.0-rc.5+2` ships as 1.1.0."""
    return tag.removeprefix("v").partition("+")[0].partition("-")[0]


def release_notes(notes: str, tag: str, limit: int) -> str:
    """Fit the notes into a store's limit, cut at a sentence, with a link."""
    url = f"{RELEASES_URL}/{tag}"
    notes = notes.strip()
    if not notes:
        return f"{tag}: {url}"
    if len(notes) <= limit:
        return notes
    suffix = f" Full notes: {url}"
    cut = notes[: limit - len(suffix)]
    sentence_ends = [match.end() for match in re.finditer(r"[.!?](?=\s|$)", cut)]
    if sentence_ends:
        cut = cut[: sentence_ends[-1]]
    else:
        cut = cut[:-1].rstrip() + "…"
    return cut + suffix


def der_signature_to_raw(der: bytes) -> bytes:
    """Convert an OpenSSL ECDSA P-256 signature to the JWT r||s form."""
    if der[0] != 0x30:
        raise ValueError("Not a DER signature")
    offset = 2
    parts = []
    for _ in range(2):
        if der[offset] != 0x02:
            raise ValueError("Not a DER integer")
        length = der[offset + 1]
        value = der[offset + 2 : offset + 2 + length]
        parts.append(value.lstrip(b"\0").rjust(32, b"\0"))
        offset += 2 + length
    return b"".join(parts)


def jwt(algorithm: str, header: dict[str, str], claims: dict[str, object], key: str) -> str:
    """Sign a JWT with `openssl`, which takes both PEM key kinds the stores issue."""
    signing_input = ".".join(
        _base64url(json.dumps(part).encode()) for part in ({"alg": algorithm, **header}, claims)
    )
    with tempfile.NamedTemporaryFile("w", suffix=".pem") as key_file:
        key_file.write(key)
        key_file.flush()
        signature = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", key_file.name],
            input=signing_input.encode(),
            capture_output=True,
            check=True,
        ).stdout
    if algorithm == "ES256":
        signature = der_signature_to_raw(signature)
    return f"{signing_input}.{_base64url(signature)}"


def request(
    method: str,
    url: str,
    token: str | None = None,
    body: object = None,
    form: dict[str, str] | None = None,
) -> Any:
    headers = {}
    data = None
    if token is not None:
        headers["Authorization"] = f"Bearer {token}"
    if form is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = urllib.parse.urlencode(form).encode()
    elif body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    try:
        with urllib.request.urlopen(
            urllib.request.Request(url, method=method, data=data, headers=headers)
        ) as response:
            payload = response.read()
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"{method} {url} failed with {error.code}: {error.read().decode()}") from error
    return json.loads(payload) if payload else None


def play(tag: str, notes: str, version_code: str) -> None:
    account = json.loads(os.environ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"])
    now = int(time.time())
    assertion = jwt(
        "RS256",
        {"typ": "JWT"},
        {
            "iss": account["client_email"],
            "scope": "https://www.googleapis.com/auth/androidpublisher",
            "aud": account["token_uri"],
            "iat": now,
            "exp": now + 600,
        },
        account["private_key"],
    )
    token = request(
        "POST",
        account["token_uri"],
        form={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion},
    )["access_token"]

    edits = f"{PLAY_API}/{APP_ID}/edits"
    edit_id = request("POST", edits, token)["id"]
    # Play only takes notes in a listing language, so use the default one.
    language = request("GET", f"{edits}/{edit_id}/details", token)["defaultLanguage"]
    release = {
        "name": tag,
        "versionCodes": [version_code],
        "status": "completed",
        "releaseNotes": [
            {"language": language, "text": release_notes(notes, tag, PLAY_NOTES_LIMIT)}
        ],
    }
    for track in PLAY_TRACKS:
        request("PUT", f"{edits}/{edit_id}/tracks/{track}", token, {"track": track, "releases": [release]})
    request("POST", f"{edits}/{edit_id}:commit", token)
    print(f"Promoted version code {version_code} to {', '.join(PLAY_TRACKS)}", flush=True)


class AppStoreConnect:
    def __init__(self, key_id: str, issuer: str, key: str) -> None:
        self.key_id = key_id
        self.issuer = issuer
        self.key = key

    def token(self) -> str:
        # Tokens live at most 20 minutes and processing can take longer, so
        # every request signs a fresh one.
        now = int(time.time())
        return jwt(
            "ES256",
            {"kid": self.key_id, "typ": "JWT"},
            {"iss": self.issuer, "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"},
            self.key,
        )

    def call(self, method: str, path: str, body: object = None) -> Any:
        return request(method, f"{APPLE_API}{path}", self.token(), body)

    def data(self, path: str) -> Any:
        return self.call("GET", path)["data"]


def wait_for_build(api: AppStoreConnect, app_id: str, version: str, build_number: str) -> dict:
    query = urllib.parse.urlencode(
        {
            "filter[app]": app_id,
            "filter[version]": build_number,
            "filter[preReleaseVersion.version]": version,
        }
    )
    deadline = time.monotonic() + PROCESSING_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        builds = api.data(f"/builds?{query}")
        state = builds[0]["attributes"]["processingState"] if builds else "not visible yet"
        if state == "VALID":
            return builds[0]
        if state in ("FAILED", "INVALID"):
            raise RuntimeError(f"Build {version} ({build_number}) is {state}")
        print(f"Build {version} ({build_number}) is {state}; waiting", flush=True)
        time.sleep(POLL_INTERVAL_SECONDS)
    raise RuntimeError(f"Build {version} ({build_number}) did not finish processing in time")


def testflight(tag: str, notes: str, build_number: str) -> None:
    api = AppStoreConnect(
        os.environ["APPLE_API_KEY"], os.environ["APPLE_API_ISSUER"], os.environ["APPLE_API_KEY_P8"]
    )
    apps = api.data(f"/apps?{urllib.parse.urlencode({'filter[bundleId]': APP_ID})}")
    if not apps:
        raise RuntimeError(f"No App Store Connect app for {APP_ID}")
    app_id = apps[0]["id"]
    locale = apps[0]["attributes"]["primaryLocale"]

    build = wait_for_build(api, app_id, store_version(tag), build_number)
    build_ref = {"type": "builds", "id": build["id"]}

    whats_new = release_notes(notes, tag, TESTFLIGHT_NOTES_LIMIT)
    localization_id = next(
        (
            localization["id"]
            for localization in api.data(f"/builds/{build['id']}/betaBuildLocalizations")
            if localization["attributes"]["locale"] == locale
        ),
        None,
    )
    if localization_id is not None:
        api.call(
            "PATCH",
            f"/betaBuildLocalizations/{localization_id}",
            {
                "data": {
                    "type": "betaBuildLocalizations",
                    "id": localization_id,
                    "attributes": {"whatsNew": whats_new},
                }
            },
        )
    else:
        api.call(
            "POST",
            "/betaBuildLocalizations",
            {
                "data": {
                    "type": "betaBuildLocalizations",
                    "attributes": {"locale": locale, "whatsNew": whats_new},
                    "relationships": {"build": {"data": build_ref}},
                }
            },
        )

    groups = api.data(f"/apps/{app_id}/betaGroups?limit=200")
    for group in groups:
        attributes = group["attributes"]
        # Internal groups with access to all builds already have it.
        if attributes.get("isInternalGroup") and attributes.get("hasAccessToAllBuilds"):
            continue
        api.call("POST", f"/betaGroups/{group['id']}/relationships/builds", {"data": [build_ref]})
        print(f"Added build to {attributes.get('name', group['id'])}", flush=True)

    external = any(not group["attributes"].get("isInternalGroup") for group in groups)
    if external and not api.data(f"/betaAppReviewSubmissions?filter[build]={build['id']}"):
        api.call(
            "POST",
            "/betaAppReviewSubmissions",
            {
                "data": {
                    "type": "betaAppReviewSubmissions",
                    "relationships": {"build": {"data": build_ref}},
                }
            },
        )
        print("Submitted build for external beta review", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("store", choices=("play", "testflight"))
    store = parser.parse_args().store
    distribute = play if store == "play" else testflight
    distribute(os.environ["TAG"], os.environ["RELEASE_NOTES"], os.environ["BUILD_NUMBER"])


if __name__ == "__main__":
    main()
