Just pushed PDF_pipeline.py which basically handles the helper functions for when you upload a PDF

/backend/PDF_pipeline.py

process_pdf is called via await whenever you upload PDF. Takes in:
- file bytes (PDF)
- file name (str)
- family id (? forgot what this is but it creates the path to s3)
- user_id (same)
(a) Creates storage path
(b) Extracts full_text / page count via extract_text(filebytes) function
(c) Classifies the category via classify_document(full_text) function which uses openAI embedding model 
(d) Stores this into supabase (including s3 path)


Also edited some parts of documents.py:
This is the flask API routing 

/backend/routers/documents.py

Still cleaning up some code so it doesn't take a while when the URL but I think post /upload is cleaned up 
