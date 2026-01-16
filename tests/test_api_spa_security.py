from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import passive_logic_simulator.api as api


@pytest.mark.skipif(not api._frontend_dist.exists(), reason="frontend/dist not present")
def test_spa_fallback_blocks_path_traversal() -> None:
    client = TestClient(api.app)

    # Path traversal attempts to sensitive files should return 404
    # (previously returned index.html with 200, now blocked entirely)
    response = client.get("/..%2F..%2Fpyproject.toml")
    assert response.status_code == 404

    # Non-sensitive paths still get SPA fallback
    response = client.get("/some-spa-route")
    assert response.status_code == 200
    assert response.text.lstrip().lower().startswith("<!doctype html>")

