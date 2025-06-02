from fastapi import APIRouter
from pydantic import BaseModel

from api.podai.podcast import process_podcast

router = APIRouter()

class PodcastRequest(BaseModel):
    script: str

@router.post("/conversion", tags=["podcast"])
async def podcast_processing(request_body: PodcastRequest):
    print(f"Received podcast script: {request_body.script[:100]}...")
    return await process_podcast(request_body.script)