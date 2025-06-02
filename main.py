from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware  # Add this import
from dotenv import load_dotenv
from api import pdf, index, script, podcast  # Import your routes

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Allows your frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include the PDF routes
app.include_router(pdf.router, prefix="/api/pdf", tags=["pdf"])

# Include the script routes
app.include_router(script.router, prefix="/api/script", tags=["script"])

# Include the podcast routes
app.include_router(podcast.router, prefix="/api/podcast", tags=["podcast"])

# Include the index routes
app.include_router(index.router, prefix="", tags=["index"])

app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
