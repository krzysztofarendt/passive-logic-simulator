from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import passive_logic_simulator.api as api


@pytest.mark.skipif(not api._frontend_dist.exists(), reason="frontend/dist not present")
def test_spa_fallback_blocks_path_traversal() -> None:
    client = TestClient(api.app)

    # If path traversal is possible, this would serve the repo's `pyproject.toml`.
    response = client.get("/..%2F..%2Fpyproject.toml")
    assert response.status_code == 200
    assert response.text.lstrip().lower().startswith("<!doctype html>")

