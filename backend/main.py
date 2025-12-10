from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH)
else:
    load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import router

app = FastAPI(title="Universal DOCX Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/debug-env")
async def debug_env():
    return {
        "JIRA_BASE": os.getenv("JIRA_BASE"),
        "JIRA_EMAIL": os.getenv("JIRA_EMAIL"),
        "JIRA_API_TOKEN": bool(os.getenv("JIRA_API_TOKEN")),
        "GEMINI_API_KEY": bool(os.getenv("GEMINI_API_KEY")),        
        "GEMINI_MODEL": os.getenv("GEMINI_MODEL"),
        
    }
