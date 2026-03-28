from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, documents, chat, family, autofill

app = FastAPI(
    title="FamilyOS API",
    description="Family document management with RAG-powered search and autofill",
    version="0.1.0",
)

# CORS — allow frontend and Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",       # Next.js dev
        "http://127.0.0.1:3000",
        "chrome-extension://*",        # Chrome extension
    ],
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


@app.get("/")
async def root():
    return {"message": "FamilyOS API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}
