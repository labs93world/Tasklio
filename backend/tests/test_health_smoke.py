"""Backend smoke regression tests for Tasklio (offline app).

Covers the deploy-fix change set:
  - GET /api/        -> {"status":"ok","app":"Tasklio","mode":"offline"}
  - GET /api/health  -> {"status":"healthy", ...}
  - GET /health      -> root-level health probe (added for deploy platform)

Public URL is used so we test exactly what users/deploy probes see.
Direct localhost:8001 is used for the root /health probe check.
"""

import os

import pytest
import requests

PUBLIC_BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not PUBLIC_BASE_URL:
    PUBLIC_BASE_URL = "https://github-import-147.preview.emergentagent.com"
DIRECT_BACKEND_URL = "http://localhost:8001"


@pytest.fixture
def api_client():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestApiRoot:
    """GET /api/ root endpoint tests."""

    def test_api_root_status_and_body(self, api_client):
        response = api_client.get(f"{PUBLIC_BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["app"] == "Tasklio"
        assert data["mode"] == "offline"

    def test_api_root_content_type_json(self, api_client):
        response = api_client.get(f"{PUBLIC_BASE_URL}/api/")
        assert "application/json" in response.headers.get("content-type", "")


class TestApiHealth:
    """GET /api/health endpoint tests."""

    def test_api_health_status_and_body(self, api_client):
        response = api_client.get(f"{PUBLIC_BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "time" in data

    def test_api_health_time_is_isoformat(self, api_client):
        response = api_client.get(f"{PUBLIC_BASE_URL}/api/health")
        data = response.json()
        # ISO-8601 timestamp from datetime.isoformat() must round-trip
        from datetime import datetime

        parsed = datetime.fromisoformat(data["time"])
        assert parsed.tzinfo is not None


class TestRootHealthProbe:
    """GET /health root-level probe (added for deploy platform checks)."""

    def test_root_health_via_public_url(self, api_client):
        response = api_client.get(f"{PUBLIC_BASE_URL}/health")
        # NOTE: ingress routes non-/api paths to the frontend (port 3000),
        # so the public /health may not reach the backend. Assert only that
        # we get a response (the deploy probe hits the backend directly).
        assert response.status_code in (200, 404)

    def test_root_health_direct_backend(self, api_client):
        response = api_client.get(f"{DIRECT_BACKEND_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "time" in data


class TestFrontendServing:
    """Frontend web preview smoke check."""

    def test_frontend_home_returns_html(self, api_client):
        response = api_client.get(f"{PUBLIC_BASE_URL}/")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
