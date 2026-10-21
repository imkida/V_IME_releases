#!/usr/bin/env python3
"""Mirror the already-published website; never manage DNS, TLS, FC or releases."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
import mimetypes
import os
from pathlib import Path
import re
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
BUCKET = "vime-official-site-cn-hangzhou"
REGION = "cn-hangzhou"
HOSTS = ("vimebot.ai", "www.vimebot.ai", "vimebot.com", "www.vimebot.com")
PAGES = ("index.html", "macos/index.html", "android/index.html", "privacy/index.html",
         "support/index.html", "macos/privacy/index.html", "macos/support/index.html")
FIXED = (*PAGES, "release.json", "macos/release.json",
         "macos/assets/app-icon-preview.svg", "macos/assets/logo-monochrome.svg")


class AssetLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ("src", "href") and value:
                self.links.append(value)


def website_files(root=ROOT):
    docs = root / "docs"
    keys = set(FIXED)
    for key in PAGES:
        parser = AssetLinks()
        parser.feed((docs / key).read_text())
        for link in parser.links:
            url = urlparse(urljoin("https://vimebot.ai/" + key, link))
            if url.netloc == "vimebot.ai" and url.path.startswith("/macos/assets/"):
                keys.add(url.path.lstrip("/"))
    files = {}
    for key in keys:
        path = docs / key
        if path.is_symlink() or not path.resolve().is_relative_to(docs.resolve()):
            raise ValueError("Refusing website symlink or external path: " + key)
        files[key] = path.read_bytes()
    canonical = (root / "macos/manifest.json").read_bytes()
    if any(files[key] != canonical for key in ("release.json", "macos/release.json")):
        raise ValueError("Website metadata differs from the canonical manifest")
    # Immutable assets first, metadata second, entry pages last. No delete/mirror --delete.
    return dict(sorted(files.items(), key=lambda item: (
        2 if item[0].endswith(".html") else 1 if item[0].endswith(".json") else 0,
        item[0])))


def read_url(url, headers=None):
    request = Request(url, headers={"User-Agent": "Vime-website-publisher", **(headers or {})})
    try:
        with urlopen(request, timeout=30) as response:
            if response.status != 200 or not response.url.startswith("https://"):
                raise RuntimeError("Website is not served over valid HTTPS: " + url)
            return response.read()
    except URLError as error:
        raise URLError(f"{url}: {error.reason}") from error


def verify_site(host, files):
    for key, data in files.items():
        # Directory requests also prove the actual default homepage mapping.
        path = key.removesuffix("index.html") if key.endswith("index.html") else key
        if read_url("https://" + host + "/" + path) != data:
            raise RuntimeError("Published website differs: " + host + "/" + path)


def require_current_main(sha):
    headers = {"Accept": "application/vnd.github+json"}
    if os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]
    current = json.loads(read_url(
        "https://api.github.com/repos/imkida/V_IME_releases/git/ref/heads/main", headers))
    if current["object"]["sha"] != sha:
        raise RuntimeError("Newer main exists; refusing to deploy this older website")


def wait_for_pages(files, sha):
    deadline = time.monotonic() + 300
    while True:
        require_current_main(sha)
        try:
            verify_site("vimebot.ai", files)
            return
        except (RuntimeError, HTTPError, URLError) as error:
            if time.monotonic() >= deadline:
                raise RuntimeError("GitHub Pages has not published this candidate; OSS unchanged") from error
            print("Waiting for GitHub Pages propagation", flush=True)
            time.sleep(15)


def deploy(files, sha):
    # Loaded only for the CI deploy action; read-only checks need no cloud credentials.
    import alibabacloud_oss_v2 as oss
    cfg = oss.config.load_default()
    cfg.region = REGION
    # The official GitHub action exports Alibaba Cloud names, not OSS_* names.
    cfg.credentials_provider = oss.credentials.StaticCredentialsProvider(
        os.environ["ALIBABA_CLOUD_ACCESS_KEY_ID"],
        os.environ["ALIBABA_CLOUD_ACCESS_KEY_SECRET"],
        os.environ["ALIBABA_CLOUD_SECURITY_TOKEN"])
    client = oss.Client(cfg)
    uploaded = []
    for key, data in files.items():
        digest = hashlib.sha256(data).hexdigest()
        immutable = bool(re.fullmatch(r"macos/assets/index-[\w-]+\.(?:css|js)", key))
        try:
            head = client.head_object(oss.HeadObjectRequest(bucket=BUCKET, key=key))
        except oss.exceptions.OperationError as error:
            cause = error.unwrap()
            # HEAD has no XML error body; the SDK exposes that 404 as BadErrorResponse.
            if not isinstance(cause, oss.exceptions.ServiceError) or not (
                    cause.code == "NoSuchKey"
                    or (cause.status_code == 404 and cause.code == "BadErrorResponse")):
                raise
            head = None
        if head is not None and (head.metadata or {}).get("sha256") == digest:
            continue
        if head is not None and immutable:
            result = client.get_object(oss.GetObjectRequest(bucket=BUCKET, key=key))
            try:
                if result.body.read() != data:
                    raise RuntimeError("Refusing to overwrite a changed immutable asset: " + key)
            finally:
                result.body.close()
        content_type = {".js": "application/javascript", ".css": "text/css",
                        ".json": "application/json", ".html": "text/html"}.get(Path(key).suffix)
        content_type = content_type or mimetypes.guess_type(key)[0] or "application/octet-stream"
        client.put_object(oss.PutObjectRequest(
            bucket=BUCKET, key=key, body=data, acl="public-read", content_type=content_type,
            cache_control="public, max-age=31536000, immutable" if immutable else "no-cache",
            metadata={"sha256": digest, "source-commit": sha}))
        uploaded.append(key)
    return uploaded


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--deploy", action="store_true")
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args()
    subprocess.run(["node", str(ROOT / "scripts/sync-download-page.mjs"), "--check"], check=True)
    files = website_files()
    sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    uploaded = []
    if args.deploy:
        if (os.environ.get("GITHUB_REPOSITORY") != "imkida/V_IME_releases"
                or os.environ.get("GITHUB_REF") != "refs/heads/main"
                or os.environ.get("GITHUB_SHA") != sha):
            raise RuntimeError("Deployment is restricted to this repository's current main workflow")
        wait_for_pages(files, sha)
        require_current_main(sha)
        uploaded = deploy(files, sha)
    for host in HOSTS:
        verify_site(host, files)
    manifest = json.loads(files["release.json"])
    release = manifest["channels"]["beta"]
    receipt = {"sourceCommit": sha, "version": release["versionName"],
               "build": release["buildNumber"], "hosts": HOSTS, "uploaded": uploaded,
               "verifiedFiles": list(files), "allBytesEqual": True}
    args.receipt.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    main()
