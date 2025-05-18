from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

@app.get("/health", status_code=200)
async def health_check():
    return {"status": "ok"}

@app.get("/")
async def read_index():
    return FileResponse("frontend/dist/index.html")
