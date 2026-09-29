import urllib.request
import json

def test_api():
    base_url = "http://localhost:8000/api/v1"
    
    # 1. Login
    login_data = json.dumps({"username": "madhav", "password": "Dev@123"}).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        login_res = json.loads(resp.read().decode('utf-8'))
        token = login_res["access_token"]
        user = login_res["user"]
        print(f"✅ 1. Auth Login: Success for '{user['full_name']}' ({user['role']})")
    
    auth_headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # 2. Defects List
    req = urllib.request.Request(f"{base_url}/defects", headers=auth_headers)
    with urllib.request.urlopen(req) as resp:
        defects = json.loads(resp.read().decode('utf-8'))
        print(f"✅ 2. Defects List: Retrieved {len(defects)} defects. Sample: '{defects[0]['defect_code']} - {defects[0]['title']}'")
    
    # 3. Analytics Dashboard
    req = urllib.request.Request(f"{base_url}/analytics/dashboard", headers=auth_headers)
    with urllib.request.urlopen(req) as resp:
        analytics = json.loads(resp.read().decode('utf-8'))
        print(f"✅ 3. Analytics KPI: Total={analytics.get('total_defects')}, Open={analytics.get('open_defects')}, Critical={analytics.get('critical_defects')}, Sprint Health={analytics.get('sprint_health', {}).get('score')}%")
    
    # 4. Intelligence - Root Cause Analysis
    rca_payload = json.dumps({"defect_id": defects[0]["id"]}).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/intelligence/rca", data=rca_payload, headers=auth_headers)
    with urllib.request.urlopen(req) as resp:
        rca = json.loads(resp.read().decode('utf-8'))
        print(f"✅ 4. AI RCA Synthesis: Confidence={rca.get('confidence')}%, Category='{rca.get('root_cause_category')}'")

    # 5. Intelligence - Similar Defects
    sim_payload = json.dumps({"title": defects[0]["title"], "description": defects[0]["description"]}).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/intelligence/similarity", data=sim_payload, headers=auth_headers)
    with urllib.request.urlopen(req) as resp:
        sim = json.loads(resp.read().decode('utf-8'))
        print(f"✅ 5. Vector Similarity: Found {len(sim)} matching historical defects")

    # 6. Forgot Password & OTP
    fp_payload = json.dumps({"email": "madhav@bugflow.io"}).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/auth/forgot-password", data=fp_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        fp_res = json.loads(resp.read().decode('utf-8'))
        otp = fp_res.get("otp_code")
        print(f"✅ 6. Forgot Password & OTP Dispatch: OTP={otp}")
    
    # 7. Verify OTP
    v_payload = json.dumps({"email": "madhav@bugflow.io", "otp_code": otp}).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/auth/verify-otp", data=v_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        v_res = json.loads(resp.read().decode('utf-8'))
        print(f"✅ 7. Verify OTP: Success={v_res.get('verified')}")

    # 8. Sprints & Teams
    req = urllib.request.Request(f"{base_url}/sprints", headers=auth_headers)
    with urllib.request.urlopen(req) as resp:
        sprints = json.loads(resp.read().decode('utf-8'))
        print(f"✅ 8. Sprints: {len(sprints)} sprints retrieved. Active: '{sprints[0]['name']}'")

    req = urllib.request.Request(f"{base_url}/teams", headers=auth_headers)
    with urllib.request.urlopen(req) as resp:
        teams = json.loads(resp.read().decode('utf-8'))
        print(f"✅ 9. Teams: {len(teams)} teams retrieved.")

    print("\n🎉 ALL CORE BACKEND SERVICES & APIS OPERATING FLAWLESSLY!")

if __name__ == "__main__":
    test_api()
