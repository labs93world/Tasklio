"""
Tasklio backend.

Tasklio is a fully OFFLINE mobile app — all user data lives on the device
(AsyncStorage + expo-file-system). The app makes no network calls. This tiny
FastAPI service exists only so the deployment pipeline has a healthy backend
process to boot behind EXPO_PUBLIC_BACKEND_URL. It exposes a couple of harmless
health endpoints and nothing that the app depends on.
"""

from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection (kept for a valid, deploy-ready stack; unused by the app).
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Tasklio")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"status": "ok", "app": "Tasklio", "mode": "offline"}


@api_router.get("/health")
async def health():
    return {"status": "healthy", "time": datetime.now(timezone.utc).isoformat()}


app.include_router(api_router)


# Root-level health probe: the deploy platform checks GET /health without the
# /api prefix, so expose the same handler there too.
@app.get("/health")
async def root_health():
    return {"status": "healthy", "time": datetime.now(timezone.utc).isoformat()}

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
