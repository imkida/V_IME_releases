"""Focused checks for the public-file boundary and metadata drift."""
import importlib.util
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("website_sync", Path(__file__).with_name("sync-website-oss.py"))
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)


class WebsiteSyncTests(unittest.TestCase):
    def test_action_credentials_reach_oss_and_public_upload(self):
        import alibabacloud_oss_v2 as oss

        action_environment = {
            "ALIBABA_CLOUD_ACCESS_KEY_ID": "synthetic-id",
            "ALIBABA_CLOUD_ACCESS_KEY_SECRET": "synthetic-secret",
            "ALIBABA_CLOUD_SECURITY_TOKEN": "synthetic-session",
        }
        with patch.dict(os.environ, action_environment, clear=True), patch.object(oss, "Client") as client:
            client.return_value.head_object.return_value = oss.HeadObjectResult(metadata={})
            self.assertEqual(sync.deploy({"index.html": b"synthetic page"}, "synthetic-commit"), ["index.html"])
            credentials = client.call_args.args[0].credentials_provider.get_credentials()
            self.assertEqual(credentials.access_key_id, "synthetic-id")
            self.assertEqual(credentials.access_key_secret, "synthetic-secret")
            self.assertEqual(credentials.security_token, "synthetic-session")
            request = client.return_value.put_object.call_args.args[0]
            self.assertEqual((request.bucket, request.key, request.body, request.acl),
                             (sync.BUCKET, "index.html", b"synthetic page", "public-read"))

    def test_only_current_website_files_and_assets_before_entry_pages(self):
        files = sync.website_files()
        assets = [key for key in files if key.endswith((".css", ".js"))]
        self.assertTrue(any(key.endswith(".css") for key in assets))
        self.assertTrue(any(key.endswith(".js") for key in assets))
        self.assertTrue(all(key in sync.FIXED or key.startswith("macos/assets/") for key in files))
        self.assertFalse(any("appcast" in key or "CNAME" in key or ".well-known" in key for key in files))
        keys = list(files)
        self.assertTrue(all(keys.index(key) < keys.index("release.json") for key in assets))
        self.assertLess(keys.index("release.json"), keys.index("index.html"))
        # The Android page ships with the keyboard screenshots it references.
        self.assertIn("android/index.html", files)
        self.assertEqual(files["android/manifest.json"], (sync.ROOT / "android/manifest.json").read_bytes())
        self.assertTrue({"macos/assets/kb-voice.png", "macos/assets/kb-pinyin.png"} <= set(files))

    def test_metadata_drift_and_external_symlink_abort_before_cloud_access(self):
        with tempfile.TemporaryDirectory(prefix="vime-website-plan-") as temporary:
            root = Path(temporary)
            shutil.copytree(sync.ROOT / "docs", root / "docs")
            (root / "macos").mkdir()
            (root / "android").mkdir()
            shutil.copyfile(sync.ROOT / "android/manifest.json", root / "android/manifest.json")
            shutil.copyfile(sync.ROOT / "macos/manifest.json", root / "macos/manifest.json")
            (root / "docs/release.json").write_text('{}')
            with self.assertRaisesRegex(ValueError, "canonical manifest"):
                sync.website_files(root)
            shutil.copyfile(root / "macos/manifest.json", root / "docs/release.json")
            canonical_android = root / "docs/android/manifest.json"
            canonical_android.write_text('{}')
            with self.assertRaisesRegex(ValueError, "Android update metadata"):
                sync.website_files(root)
            shutil.copyfile(root / "android/manifest.json", canonical_android)
            asset = root / "docs/macos/assets/logo-monochrome.svg"
            asset.unlink()
            asset.symlink_to(root / "macos/manifest.json")
            with self.assertRaisesRegex(ValueError, "symlink or external"):
                sync.website_files(root)


if __name__ == '__main__':
    unittest.main()
