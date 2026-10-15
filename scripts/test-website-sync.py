"""Focused checks for the public-file boundary and metadata drift."""
import importlib.util
from pathlib import Path
import shutil
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location("website_sync", Path(__file__).with_name("sync-website-oss.py"))
sync = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync)


class WebsiteSyncTests(unittest.TestCase):
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

    def test_metadata_drift_and_external_symlink_abort_before_cloud_access(self):
        with tempfile.TemporaryDirectory(prefix="vime-website-plan-") as temporary:
            root = Path(temporary)
            shutil.copytree(sync.ROOT / "docs", root / "docs")
            (root / "macos").mkdir()
            shutil.copyfile(sync.ROOT / "macos/manifest.json", root / "macos/manifest.json")
            (root / "docs/release.json").write_text('{}')
            with self.assertRaisesRegex(ValueError, "canonical manifest"):
                sync.website_files(root)
            shutil.copyfile(root / "macos/manifest.json", root / "docs/release.json")
            asset = root / "docs/macos/assets/logo-monochrome.svg"
            asset.unlink()
            asset.symlink_to(root / "macos/manifest.json")
            with self.assertRaisesRegex(ValueError, "symlink or external"):
                sync.website_files(root)


if __name__ == '__main__':
    unittest.main()
