from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, documents, chat, family, autofill, operations, dashboard

app = FastAPI(
    title="FamilyOS API",
    description="Family document management with RAG-powered search and autofill",
    version="0.1.0",
)

# CORS — allow frontend and Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    # Allow local frontend dev on any port (3000, 3001, etc.) and Chrome extension origins.
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?|chrome-extension://.*)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(family.router)
app.include_router(autofill.router)
app.include_router(operations.router)
app.include_router(dashboard.router)


@app.get("/")
async def root():
    return {"message": "FamilyOS API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
