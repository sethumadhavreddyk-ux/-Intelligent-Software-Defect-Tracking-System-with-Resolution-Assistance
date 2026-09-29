def test_ai_assist_report_formatting(client, dev_headers):
    raw_input = "Login is not working"
    response = client.post("/api/v1/intelligence/format-report", json={
        "raw_text": raw_input
    }, headers=dev_headers)
    assert response.status_code == 200
    data = response.json()
    assert "missing_fields" in data
    assert len(data["missing_fields"]) > 0
    assert "completeness_score" in data
    assert data["completeness_score"] < 60
    assert "suggested_title" in data
    assert "formatted_description" in data

def test_intelligent_classification(client, dev_headers):
    payload = {
        "title": "Payment gateway drops all checkout transactions during flash sale",
        "description": "Users are unable to complete payment, page displays 500 error code."
    }
    response = client.post("/api/v1/intelligence/classify", json=payload, headers=dev_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["suggested_category"] == "Payment"
    assert data["suggested_severity"] in ["Critical", "High"]
    assert data["confidence"] > 0.7

def test_similar_and_duplicate_detection(client, dev_headers):
    # Query very similar to DEF-101 ("Payment page crashes when user clicks Submit")
    response = client.post(
        "/api/v1/intelligence/similar?title=Payment%20submission%20causes%20application%20crash&description=Clicking%20submit%20crashes%20payment%20page",
        headers=dev_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_found"] > 0
    assert len(data["matches"]) > 0
    # Top match should have similarity score
    top = data["matches"][0]
    assert top["similarity_score"] >= 0.20

def test_resolution_assistance(client, dev_headers):
    payload = {
        "title": "Payment crashes after clicking Submit",
        "description": "Unchecked response from gateway leads to undefined error.",
        "category": "Payment"
    }
    response = client.post("/api/v1/intelligence/resolution-assist", json=payload, headers=dev_headers)
    assert response.status_code == 200
    data = response.json()
    assert "investigation_areas" in data
    assert len(data["investigation_areas"]) > 0
    assert "recommended_solution" in data
    assert "historical_resolutions" in data
    assert "disclaimer" in data

def test_sprint_health_score(client, dev_headers):
    response = client.get("/api/v1/sprints/1/health", headers=dev_headers)
    assert response.status_code == 200
    data = response.json()
    assert "health_score" in data
    assert 0 <= data["health_score"] <= 100
    assert "risk_level" in data
    assert data["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
    assert "explanation" in data
    assert len(data["recommended_actions"]) > 0
