from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend_unified.utils.logger import get_logger
import time

logger = get_logger("main_app")

app = FastAPI(
    title="AI-Powered Adaptive Learning Platform",
    description="Backend for the AI adaptive intelligence engine.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"Method: {request.method} Path: {request.url.path} Status: {response.status_code} Time: {process_time:.4f}s")
    return response

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

from backend_unified.routers import syllabus, test, session, report, profile, quiz_party_ws

app.include_router(syllabus.router, prefix="/api/syllabus", tags=["Syllabus"])
app.include_router(test.router, prefix="/api/test", tags=["Test Plan"])
app.include_router(session.router, prefix="/api/session", tags=["Session & Core Adaptive"])
app.include_router(report.router, prefix="/api/report", tags=["Reporting"])
app.include_router(profile.router, prefix="/api/profile", tags=["Psychological Profiling"])
app.include_router(quiz_party_ws.router, prefix="/api/quiz-party", tags=["Quiz Party Realtime"])

if __name__ == "__main__":
    import uvicorn
    import sys
    from pathlib import Path
    # Ensure current dir is in sys.path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    
    from backend_unified.config import settings
    uvicorn.run("backend_unified.main:app", host=settings.FASTAPI_HOST, port=settings.FASTAPI_PORT, reload=True)
