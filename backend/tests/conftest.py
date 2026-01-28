import importlib
import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture(scope="session")
def app_module(tmp_path_factory):
    db_path = tmp_path_factory.mktemp("db") / "test.db"
    mp = pytest.MonkeyPatch()
    mp.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    mp.setenv("JWT_SECRET", "test-secret")
    mp.setenv("BMC_WEBHOOK_SECRET", "test-bmc-secret")
    mp.setenv("FREE_LIMIT", "2")
    try:
        app_module = importlib.import_module("app")
        with app_module.app.app_context():
            app_module.db.drop_all()
            app_module.db.create_all()
        return app_module
    finally:
        mp.undo()


@pytest.fixture()
def client(app_module):
    return app_module.app.test_client()
