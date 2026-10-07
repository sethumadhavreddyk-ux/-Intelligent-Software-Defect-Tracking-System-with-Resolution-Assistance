import os
import sys

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.database import Base, get_db
from app.main import app
from app.seed_data import seed_database


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = session_factory()
    seed_database(db)
    db.close()

    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        if previous_override:
            app.dependency_overrides[get_db] = previous_override
        else:
            app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_api(client):
    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "madhav", "password": "Dev@123"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/v1/defects", headers=headers).status_code == 200
    assert client.get("/api/v1/analytics/dashboard", headers=headers).status_code == 200
    assert client.get("/api/v1/rag/stats", headers=headers).status_code == 200

    openapi = client.get("/openapi.json").json()
    assert "/api/v1/users/{user_id}/role" in openapi["paths"]
    assert "/api/v1/rag/documents/{document_id}" in openapi["paths"]
    assert "/api/v1/auth/oauth/{provider}/callback" in openapi["paths"]
