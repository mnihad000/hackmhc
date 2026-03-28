from openai import OpenAI
from config import OPENAI_API_KEY
from services.supabase_client import get_supabase

client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = """You are a helpful family document assistant for FamilyOS.
Answer the user's question using ONLY the provided document excerpts.
If the answer is not in the documents, say "I don't have that information in your uploaded documents."
Always cite which document the information came from using [Document: filename] format.
Be concise and accurate."""


def embed_query(text: str) -> list[float]:
    """Generate embedding for a search query."""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


def search_chunks(query_embedding: list[float], family_id: str, top_k: int = 5) -> list[dict]:
    """Search for similar document chunks using pgvector."""
    supabase = get_supabase()
    result = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_family_id": family_id,
            "match_count": top_k,
        },
    ).execute()
    return result.data or []


def build_context(chunks: list[dict], family_id: str) -> str:
    """Build context string from retrieved chunks with document names."""
    if not chunks:
        return "No relevant documents found."

    supabase = get_supabase()

    # Get document filenames for citations
    doc_ids = list({c["document_id"] for c in chunks})
    docs_result = (
        supabase.table("documents")
        .select("id, filename")
        .in_("id", doc_ids)
        .execute()
    )
    doc_names = {d["id"]: d["filename"] for d in (docs_result.data or [])}

    context_parts = []
    for chunk in chunks:
        filename = doc_names.get(chunk["document_id"], "Unknown document")
        context_parts.append(f"[Document: {filename}]\n{chunk['content']}")

    return "\n\n---\n\n".join(context_parts)


async def rag_query(question: str, family_id: str) -> dict:
    """
    Full RAG pipeline:
    1. Embed the question
    2. Search for relevant chunks
    3. Build context from chunks
    4. Generate answer with GPT-4o-mini
    5. Return answer + sources
    """
    # 1. Embed
    query_embedding = embed_query(question)

    # 2. Search
    chunks = search_chunks(query_embedding, family_id)

    # 3. Build context
    context = build_context(chunks, family_id)

    # 4. Generate answer
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

    answer = response.choices[0].message.content

    # 5. Build sources list
    supabase = get_supabase()
    doc_ids = list({c["document_id"] for c in chunks})
    sources = []
    if doc_ids:
        docs_result = (
            supabase.table("documents")
            .select("id, filename")
            .in_("id", doc_ids)
            .execute()
        )
        sources = [
            {"document_id": d["id"], "filename": d["filename"]}
            for d in (docs_result.data or [])
        ]

    return {
        "answer": answer,
        "sources": sources,
    }


async def autofill_query(fields: list[dict], family_id: str) -> dict:
    """
    Autofill pipeline for Chrome extension:
    1. Embed concatenated field labels
    2. Search for relevant chunks
    3. Ask LLM to extract field values from context
    4. Return field-value mapping
    """
    # Build a search query from field labels
    field_descriptions = ", ".join(
        f.get("label") or f.get("field_name", "") for f in fields
    )
    query_embedding = embed_query(f"Form fields: {field_descriptions}")

    # Search with more results for autofill
    chunks = search_chunks(query_embedding, family_id, top_k=10)
    context = build_context(chunks, family_id)

    # Build field list for the prompt
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

    import json

    raw = response.choices[0].message.content.strip()
    try:
        fills = json.loads(raw)
    except json.JSONDecodeError:
        fills = {}

    # Collect source filenames
    supabase = get_supabase()
    doc_ids = list({c["document_id"] for c in chunks})
    source_names = []
    if doc_ids:
        docs_result = (
            supabase.table("documents")
            .select("filename")
            .in_("id", doc_ids)
            .execute()
        )
        source_names = [d["filename"] for d in (docs_result.data or [])]

    return {
        "fills": fills,
        "sources": source_names,
    }
