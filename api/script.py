from fastapi import APIRouter
from pydantic import BaseModel

from api.podai.process import process_markdown_to_podcast

router = APIRouter()

class ScriptRequest(BaseModel):
    markdown_text: str

@router.post("/script", tags=["script"])
async def script_processing(request_body: ScriptRequest):
    return await process_markdown_to_podcast(request_body.markdown_text)