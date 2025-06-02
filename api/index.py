from fastapi import APIRouter, File, UploadFile
from fastapi.responses import FileResponse

router = APIRouter()

@router.get("/")
async def read_index():
    return FileResponse("frontend/dist/index.html")