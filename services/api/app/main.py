from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="HF-CDF API",
    description="Autonomous Cyber Defense Force platform API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.get("/", tags=["Platform"])
async def root():
    return {
        "name": "HF-CDF",
        "service": "API",
        "version": "0.1.0",
        "status": "running",
    }

@app.get("/health/live", tags=["Health"])
async def health_live():
    return {"status": "alive"}
