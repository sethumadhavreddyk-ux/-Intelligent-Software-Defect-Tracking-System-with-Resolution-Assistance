import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(username="admin", password="Admin@123"):
    res = client.post("/api/v1/auth/login", json={"username_or_email": username, "password": password})
    assert res.status_code == 200, f"Failed to login: {res.text}"
    return res.json()["access_token"]

def test_qr_authentication_cycle():
    # 1. Generate QR Code
    res_gen = client.post("/api/v1/auth/qr/generate")
    assert res_gen.status_code == 200
    data = res_gen.json()
    token_str = data["qr_token"]
    assert "BF-QR-" in token_str
    assert "<svg" in data["qr_svg"]

    # 2. Check pending status
    res_status1 = client.get(f"/api/v1/auth/qr/status/{token_str}")
    assert res_status1.status_code == 200
    assert res_status1.json()["authenticated"] is False

    # 3. Simulate mobile scan authenticate
    res_auth = client.post("/api/v1/auth/qr/authenticate", json={"qr_token": token_str, "username_or_email": "madhav@bugflow.io"})
    assert res_auth.status_code == 200

    # 4. Check authorized status & token issuance
    res_status2 = client.get(f"/api/v1/auth/qr/status/{token_str}")
    assert res_status2.status_code == 200
    auth_data = res_status2.json()
    assert auth_data["authenticated"] is True
    assert "access_token" in auth_data["token"]
    assert auth_data["token"]["user"]["username"] == "madhav"

def test_roles_matrix_and_role_assignment():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch permissions matrix
    res_matrix = client.get("/api/v1/users/roles/matrix", headers=headers)
    assert res_matrix.status_code == 200
    matrix = res_matrix.json()
    assert len(matrix) >= 4
    roles = [m["role"] for m in matrix]
    assert "Admin" in roles
    assert "Developer" in roles
    assert "QA / Tester" in roles

    # 2. Get list of users to find a target user
    res_users = client.get("/api/v1/users", headers=headers)
    assert res_users.status_code == 200
    users = res_users.json()
    target_user = [u for u in users if u["username"] == "rajesh"][0]

    # 3. Assign role to target user
    res_assign = client.patch(
        f"/api/v1/users/{target_user['id']}/role",
        headers=headers,
        json={"role": "Project Manager"}
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["role"] == "Project Manager"

    # 4. Revert role
    res_revert = client.patch(
        f"/api/v1/users/{target_user['id']}/role",
        headers=headers,
        json={"role": "Developer"}
    )
    assert res_revert.status_code == 200
    assert res_revert.json()["role"] == "Developer"

def test_rag_knowledge_pipeline():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. RAG stats
    res_stats = client.get("/api/v1/rag/stats", headers=headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_documents"] >= 4
    assert stats["total_chunks"] >= 8

    # 2. List documents
    res_docs = client.get("/api/v1/rag/documents", headers=headers)
    assert res_docs.status_code == 200
    docs = res_docs.json()
    assert len(docs) >= 4
    payment_doc = [d for d in docs if "Payment" in d["title"] or d["category"] == "Payment"][0]
    assert len(payment_doc["chunks"]) > 0

    # 3. Ingest custom document
    new_doc_payload = {
        "title": "Redis Distributed Lock Specification for Sprint Burndown",
        "category": "Database",
        "doc_type": "technical_spec",
        "content": "To prevent concurrent duplicate job triggers, all workers acquire a Redlock mutex with a 5000ms TTL. On failure, exponential jitter backoff is applied.",
        "tags": "redis, redlock, mutex, concurrency"
    }
    res_ingest = client.post("/api/v1/rag/documents", headers=headers, json=new_doc_payload)
    assert res_ingest.status_code == 200
    created_doc = res_ingest.json()
    assert created_doc["title"] == new_doc_payload["title"]
    assert len(created_doc["chunks"]) >= 1

    # 4. Semantic search
    res_search = client.post(
        "/api/v1/rag/search",
        headers=headers,
        json={"query": "webhook idempotency payment failure duplicate", "top_k": 3}
    )
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert search_data["total_found"] > 0
    assert search_data["results"][0]["relevance_pct"] > 30

    # 5. RAG QA query
    res_query = client.post(
        "/api/v1/rag/query",
        headers=headers,
        json={"query": "How do we handle duplicate payment webhook events?"}
    )
    assert res_query.status_code == 200
    query_data = res_query.json()
    assert len(query_data["answer"]) > 50
    assert query_data["confidence"] > 0.0

def test_defect_attachments_endpoints():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Get first defect
    res_defects = client.get("/api/v1/defects", headers=headers)
    assert res_defects.status_code == 200
    defect = res_defects.json()[0]

    # Add attachment
    att_payload = {
        "file_name": "stacktrace_error_log.txt",
        "file_url": "https://storage.bugflow.io/attachments/stacktrace_108.txt",
        "file_size": 24560,
        "file_type": "text/plain"
    }
    res_add = client.post(f"/api/v1/defects/{defect['id']}/attachments", headers=headers, json=att_payload)
    assert res_add.status_code == 200
    att_data = res_add.json()
    assert att_data["file_name"] == att_payload["file_name"]
    att_id = att_data["id"]

    # List attachments
    res_list = client.get(f"/api/v1/defects/{defect['id']}/attachments", headers=headers)
    assert res_list.status_code == 200
    assert any(a["id"] == att_id for a in res_list.json())

    # Delete attachment
    res_del = client.delete(f"/api/v1/defects/{defect['id']}/attachments/{att_id}", headers=headers)
    assert res_del.status_code == 200

def test_testing_and_cicd_endpoints():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Suites
    res_suites = client.get("/api/v1/testing/suites", headers=headers)
    assert res_suites.status_code == 200
    assert len(res_suites.json()) == 6

    # 2. Run tests
    res_run = client.post("/api/v1/testing/run", headers=headers)
    assert res_run.status_code == 200
    run_data = res_run.json()
    assert run_data["total_tests"] >= 30
    assert run_data["passed"] >= 30
    assert run_data["coverage_pct"] >= 90.0

    # 3. CI/CD runs
    res_cicd = client.get("/api/v1/testing/cicd", headers=headers)
    assert res_cicd.status_code == 200
    assert len(res_cicd.json()) >= 3
