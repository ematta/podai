from fastapi import APIRouter, File, UploadFile
from api.podai.process import parse_pdf_to_markdown

router = APIRouter()

@router.post("/parse", tags=["pdf"])
async def parse_pdf_endpoint(file: UploadFile = File(...)):
    return await parse_pdf_to_markdown(file)
