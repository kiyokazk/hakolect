import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, DATABASE_URL
from .routers import bookmarks, folders, tags


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure data directory exists before creating tables
    if DATABASE_URL.startswith("sqlite"):
        db_path = DATABASE_URL.replace("sqlite:///", "").replace("sqlite://", "")
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    lifespan=lifespan,
    title="hakolect API",
    description="Personal bookmark manager API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Single-user personal tool; Caddy handles auth
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/hakolect/v1"

app.include_router(bookmarks.router, prefix=API_PREFIX)
app.include_router(folders.router, prefix=API_PREFIX)
app.include_router(tags.router, prefix=API_PREFIX)


@app.get("/api/hakolect/health")
def health_check():
    return {"status": "ok", "service": "hakolect"}
