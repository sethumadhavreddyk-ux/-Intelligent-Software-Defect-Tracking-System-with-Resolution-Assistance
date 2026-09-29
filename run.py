import uvicorn
import os
import sys

# Ensure backend directory is in python path
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

if __name__ == "__main__":
    print("=" * 70)
    print(">> INTELLIGENT DEFECT TRACKING & RESOLUTION ASSISTANCE PLATFORM")
    print("=" * 70)
    print("-> Frontend UI:             http://localhost:8000")
    print("-> Interactive Swagger API: http://localhost:8000/docs")
    print("-> ReDoc API Specification: http://localhost:8000/redoc")
    print("-> Default Admin:           admin / Admin@123")
    print("-> Default Developer:       dev_alex / Dev@123")
    print("-> Default QA Tester:       qa_priya / Qa@123")
    print("=" * 70)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
