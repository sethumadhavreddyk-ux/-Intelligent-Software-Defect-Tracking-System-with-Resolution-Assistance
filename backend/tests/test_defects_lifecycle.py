def test_create_defect(client, dev_headers):
    payload = {
        "title": "Stripe webhook 400 Bad Request error on payment capture",
        "raw_description": "Stripe webhook fails to verify signature when payload timestamp differs by 300 seconds.",
        "project_id": 1,
        "priority": "High",
        "severity": "High",
        "category": "Payment",
        "defect_type": "Functional Defect"
    }
    response = client.post("/api/v1/defects", json=payload, headers=dev_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["key"].startswith("DEF-")
    assert data["status"] == "Reported"
    assert data["title"] == payload["title"]

def test_full_lifecycle_and_rbac_guards(client, dev_headers, qa_headers):
    # 1. Create defect
    res = client.post("/api/v1/defects", json={
        "title": "Cart items vanish on browser refresh",
        "project_id": 1,
        "priority": "Medium",
        "severity": "Medium",
        "category": "UI / UX",
        "defect_type": "Functional Defect"
    }, headers=qa_headers)
    assert res.status_code == 200
    defect_id = res.json()["id"]

    # 2. Assign defect
    res = client.patch(f"/api/v1/defects/{defect_id}/status", json={
        "status": "Assigned",
        "comment": "Assigned to backend team"
    }, headers=dev_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "Assigned"

    # 3. In Progress
    res = client.patch(f"/api/v1/defects/{defect_id}/status", json={
        "status": "In Progress"
    }, headers=dev_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "In Progress"

    # 4. In Review
    res = client.patch(f"/api/v1/defects/{defect_id}/status", json={
        "status": "In Review",
        "comment": "PR created and awaiting review"
    }, headers=dev_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "In Review"

    # 5. Resolved
    res = client.patch(f"/api/v1/defects/{defect_id}/status", json={
        "status": "Resolved",
        "root_cause": "Session storage wiped on refresh",
        "resolution_summary": "Persisted cart state in localStorage and backend database."
    }, headers=dev_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "Resolved"

    # 6. RBAC Guard: Developer attempts to Verify -> Should fail with 403
    res_fail = client.patch(f"/api/v1/defects/{defect_id}/status", json={
        "status": "Verified"
    }, headers=dev_headers)
    assert res_fail.status_code == 403

    # 7. QA verifies defect -> Should succeed
    res_verify = client.patch(f"/api/v1/defects/{defect_id}/status", json={
        "status": "Verified",
        "comment": "QA passed all regression scenarios"
    }, headers=qa_headers)
    assert res_verify.status_code == 200
    assert res_verify.json()["status"] == "Verified"

    # 8. Close defect
    res_close = client.patch(f"/api/v1/defects/{defect_id}/status", json={
        "status": "Closed"
    }, headers=qa_headers)
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "Closed"

def test_add_comment(client, dev_headers):
    res = client.post("/api/v1/defects/1/comments", json={
        "content": "Automated integration test passed with mock gateway."
    }, headers=dev_headers)
    assert res.status_code == 200
    assert res.json()["content"] == "Automated integration test passed with mock gateway."

def test_teams_crud(client, admin_headers):
    # Create Team
    res = client.post("/api/v1/teams", json={
        "name": "DevOps & SRE Squad",
        "description": "Infrastructure, CI/CD, and kubernetes operations"
    }, headers=admin_headers)
    assert res.status_code == 200
    team_id = res.json()["id"]

    # Add member
    add_m = client.post(f"/api/v1/teams/{team_id}/members", json={
        "user_id": 3,
        "role_in_team": "Senior SRE"
    }, headers=admin_headers)
    assert add_m.status_code == 200

    # Update team
    up_res = client.put(f"/api/v1/teams/{team_id}", json={
        "description": "Updated SRE description"
    }, headers=admin_headers)
    assert up_res.status_code == 200
    assert up_res.json()["description"] == "Updated SRE description"
