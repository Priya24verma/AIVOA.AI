from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.deviation import router as deviation_router

app = FastAPI(
    title="AIVOA Deviation Copilot",
    description="AI-powered pharmaceutical deviation intake system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
   allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deviation_router)

@app.get("/")
def root():
    return {
        "message": "AIVOA Deviation Copilot API",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }