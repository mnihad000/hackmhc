import json
import re
from typing import Optional

from openai import OpenAI

from config import RESOLVED_OPENAI_API_KEY
from services.supabase_client import get_supabase

client = OpenAI(api_key=RESOLVED_OPENAI_API_KEY)

FALLBACK_ANSWER = "Sorry, we couldn't find that in your uploaded documents."
MIN_SIMILARITY = 0.3

SYSTEM_PROMPT = """You are Docster, a helpful family document assistant for FamilyOS.
Answer the user's question using ONLY the provided document excerpts.
When excerpts are relevant but incomplete, summarize what is present and clearly mention what is missing.
Only use the fallback sentence when no relevant document excerpts are provided.
Always cite which document the information came from using [Document: filename] format.
Be concise and accurate."""

CATEGORY_KEYWORDS = {
    "finance": {
        "finance",
        "financial",
        "bank",
        "income",
        "salary",
        "tax",
        "w2",
        "w-2",
        "w4",
        "w-4",
        "paystub",
        "mortgage",
        "credit",
        "loan",
        "budget",
        "invoice",
        "tax return",
        "tax refund",
        "refund",
        "irs",
        "withholding",
        "deduction",
        "deductions",
        "filing",
        "federal tax",
        "state tax",
        "1040",
        "1040ez",
        "1040a",
        "1099",
        "1099-nec",
        "1099-misc",
        "1098",
        "schedule c",
        "schedule a",
        "schedule b",
    },
    "medical": {
        "health",
        "healthcare",
        "medical",
        "medicine",
        "doctor",
        "hospital",
        "clinic",
        "insurance",
        "prescription",
        "diagnosis",
        "lab",
        "immunization",
        "vaccine",
    },
    "education": {
        "school",
        "education",
        "report card",
        "transcript",
        "grade",
        "teacher",
        "student",
        "class",
        "semester",
        "university",
        "college",
        "homework",
    },
    "identity": {
        "identity",
        "id",
        "passport",
        "birth certificate",
        "driver license",
        "driver's license",
        "ssn",
        "social security",
    },
    "legal": {
        "legal",
        "law",
        "attorney",
        "court",
        "contract",
        "agreement",
        "will",
        "lease",
        "policy",
        "notary",
    },
}


def embed_query(text: str) -> list[float]:
    """Generate embedding for a search query."""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


def infer_category(question: str) -> str:
    """Infer a single category from the user question. Defaults to 'other'."""
    lowered = question.lower()
    tokens = set(re.findall(r"[a-z0-9']+", lowered))
    best_category = "other"
    best_score = 0

    def keyword_matches(keyword: str) -> bool:
        if " " in keyword or "-" in keyword or "'" in keyword:
            return keyword in lowered
        return keyword in tokens

    for category, keywords in CATEGORY_KEYWORDS.items():
        keyword_score = sum(1 for kw in keywords if keyword_matches(kw))
        if keyword_score > best_score:
            best_score = keyword_score
            best_category = category

    return best_category if best_score > 0 else "other"


def search_chunks(
    query_embedding: list[float],
    family_id: str,
    category: Optional[str] = None,
    top_k: int = 5,
) -> list[dict]:
    """Search for similar document chunks using pgvector with optional category routing."""
    supabase = get_supabase()
    params = {
        "query_embedding": query_embedding,
        "match_family_id": family_id,
        "match_count": top_k,
        # Always pass match_category to disambiguate overloaded Postgres RPC signatures.
        "match_category": category,
    }

    result = supabase.rpc("match_chunks", params).execute()
    return result.data or []


def build_context(chunks: list[dict], family_id: str) -> str:
    """Build context string from retrieved chunks with document names."""
    if not chunks:
        return "No relevant documents found."

    supabase = get_supabase()

    doc_ids = list({c["document_id"] for c in chunks})
    docs_result = (
        supabase.table("documents")
        .select("id, filename")
        .in_("id", doc_ids)
        .eq("family_id", family_id)
        .execute()
    )
    doc_names = {d["id"]: d["filename"] for d in (docs_result.data or [])}

    context_parts = []
    for chunk in chunks:
        filename = doc_names.get(chunk["document_id"], "Unknown document")
        context_parts.append(f"[Document: {filename}]\n{chunk['content']}")

    return "\n\n---\n\n".join(context_parts)


def has_relevant_chunks(chunks: list[dict], threshold: float = MIN_SIMILARITY) -> bool:
    """Check if any chunk has sufficient similarity to answer confidently."""
    return any((chunk.get("similarity") or 0) >= threshold for chunk in chunks)


def max_similarity(chunks: list[dict]) -> float:
    """Return highest similarity score from retrieved chunks."""
    if not chunks:
        return 0.0
    return max(float(chunk.get("similarity") or 0.0) for chunk in chunks)


def build_sources(chunks: list[dict], family_id: str) -> list[dict]:
    """Collect unique source document ids and filenames for the response."""
    if not chunks:
        return []

    supabase = get_supabase()
    doc_ids = list({c["document_id"] for c in chunks})
    docs_result = (
        supabase.table("documents")
        .select("id, filename")
        .in_("id", doc_ids)
        .eq("family_id", family_id)
        .execute()
    )
    return [
        {"document_id": d["id"], "filename": d["filename"]}
        for d in (docs_result.data or [])
    ]


async def rag_query(question: str, family_id: str) -> dict:
    """
    Full RAG pipeline:
    1. Infer category from question (fallback to other)
    2. Embed question
    3. Search for relevant chunks filtered by category
    4. Generate answer if relevant chunks exist, else fallback
    """
    routed_category = infer_category(question)
    query_embedding = embed_query(question)
    primary_chunks = search_chunks(query_embedding, family_id, category=routed_category)
    primary_max_similarity = max_similarity(primary_chunks)
    used_fallback_search = False

    chunks = primary_chunks
    if not primary_chunks or primary_max_similarity < MIN_SIMILARITY:
        fallback_chunks = search_chunks(query_embedding, family_id, category=None)
        if fallback_chunks:
            chunks = fallback_chunks
            used_fallback_search = True

    if not chunks or not has_relevant_chunks(chunks):
        return {
            "answer": FALLBACK_ANSWER,
            "sources": [],
            "route_category": routed_category,
            "used_fallback_search": used_fallback_search,
            "max_similarity": max_similarity(chunks),
        }

    context = build_context(chunks, family_id)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"--- DOCUMENT EXCERPTS ---\n{context}\n--- END EXCERPTS ---\n\nQuestion: {question}",
            },
        ],
        max_tokens=500,
        temperature=0.2,
    )

    answer = (response.choices[0].message.content or "").strip()
    if not answer:
        answer = FALLBACK_ANSWER

    sources = build_sources(chunks, family_id)
    return {
        "answer": answer,
        "sources": sources,
        "route_category": routed_category,
        "used_fallback_search": used_fallback_search,
        "max_similarity": max_similarity(chunks),
    }


async def autofill_query(fields: list[dict], family_id: str) -> dict:
    """
    Autofill pipeline for Chrome extension:
    1. Embed concatenated field labels
    2. Search for relevant chunks
    3. Ask LLM to extract field values from context
    4. Return field-value mapping
    """
    field_descriptions = ", ".join(
        f.get("label") or f.get("field_name", "") for f in fields
    )
    query_embedding = embed_query(f"Form fields: {field_descriptions}")
    chunks = search_chunks(query_embedding, family_id, top_k=10)

    if not chunks or not has_relevant_chunks(chunks, threshold=0.5):
        return {"fills": {}, "sources": []}

    context = build_context(chunks, family_id)
    field_list = "\n".join(
        f'- field_name: "{f["field_name"]}", label: "{f.get("label", "")}", type: "{f.get("type", "text")}"'
        for f in fields
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a form autofill assistant. Given document excerpts and a list of form fields, "
                    "extract the most appropriate value for each field from the documents. "
                    "Return ONLY a valid JSON object mapping field_name to value. "
                    "If you cannot find a value for a field, omit it from the response. "
                    "Do not wrap the JSON in markdown code blocks."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"--- DOCUMENT EXCERPTS ---\n{context}\n--- END EXCERPTS ---\n\n"
                    f"Form fields to fill:\n{field_list}\n\n"
                    "Return JSON mapping field_name to value:"
                ),
            },
        ],
        max_tokens=500,
        temperature=0,
    )

    raw = (response.choices[0].message.content or "").strip()
    try:
        fills = json.loads(raw)
    except json.JSONDecodeError:
        fills = {}

    source_names = [s["filename"] for s in build_sources(chunks, family_id) if s.get("filename")]
    return {
        "fills": fills,
        "sources": source_names,
    }
