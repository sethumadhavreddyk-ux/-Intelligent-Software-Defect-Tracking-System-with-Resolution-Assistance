import pytest
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.seed_data import seed_database
from app.auth.security import create_access_token

# In-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///./test_in_memory.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_in_memory.db"):
        try:
            os.remove("./test_in_memory.db")
        except Exception:
            pass

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def admin_headers():
    token = create_access_token(data={"sub": "admin", "role": "Admin"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def dev_headers():
    token = create_access_token(data={"sub": "dev_alex", "role": "Developer"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="module")
def qa_headers():
    token = create_access_token(data={"sub": "qa_priya", "role": "QA / Tester"})
    return {"Authorization": f"Bearer {token}"}
