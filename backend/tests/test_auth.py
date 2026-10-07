def test_login_success(client):
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "Admin@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"] == "Admin"

def test_login_invalid_password(client):
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401

def test_forgot_password_and_otp_verification(client):
    # Step 1: Request OTP
    req = client.post("/api/v1/auth/forgot-password", json={
        "email": "alex.dev@defecttracker.com"
    })
    assert req.status_code == 200
    otp_data = req.json()
    assert "otp_code" in otp_data
    otp_code = otp_data["otp_code"]

    # Step 2: Verify OTP
    verify_resp = client.post("/api/v1/auth/verify-otp", json={
        "email": "alex.dev@defecttracker.com",
        "otp": otp_code
    })
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verified"] is True

    # Step 3: Reset password
    reset_resp = client.post("/api/v1/auth/reset-password", json={
        "email": "alex.dev@defecttracker.com",
        "otp": otp_code,
        "new_password": "NewSecretPass@2026"
    })
    assert reset_resp.status_code == 200

    # Step 4: Login with new password
    login_new = client.post("/api/v1/auth/login", json={
        "username_or_email": "alex.dev@defecttracker.com",
        "password": "NewSecretPass@2026"
    })
    assert login_new.status_code == 200

def test_face_auth(client):
    response = client.post("/api/v1/auth/face-auth", json={
        "email_or_username": "dev_alex",
        "face_detected": True,
        "confidence": 0.96
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_oauth_requires_provider_configuration(client, monkeypatch):
    from app.routers import auth as auth_router
    monkeypatch.setattr(auth_router, "get_oauth_client", lambda provider: None)

    for provider in ["google", "microsoft", "github", "linkedin"]:
        response = client.get(f"/api/v1/auth/oauth/{provider}", follow_redirects=False)
        assert response.status_code == 303
        assert f"{provider}_not_configured" in response.headers["location"]
        assert client.post(f"/api/v1/auth/oauth/{provider}").status_code == 405


def test_oauth_callback_uses_verified_provider_identity(client, monkeypatch):
    from app.routers import auth as auth_router

    class FakeOAuthClient:
        async def authorize_access_token(self, request):
            return {
                "userinfo": {
                    "sub": "test-google-subject-2026",
                    "email": "oauth-callback-user@example.com",
                    "email_verified": True,
                    "name": "OAuth Callback User"
                }
            }

    monkeypatch.setattr(auth_router, "get_oauth_client", lambda provider: FakeOAuthClient())
    response = client.get(
        "/api/v1/auth/oauth/google/callback",
        follow_redirects=False
    )
    assert response.status_code == 303
    token = response.headers["location"].split("oauth_access_token=", 1)[1]

    profile_response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_response.status_code == 200
    assert profile_response.json()["email"] == "oauth-callback-user@example.com"
    assert profile_response.json()["role"] == "Developer"
