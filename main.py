from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware  # Add this import
from api.pdf import routes as pdf_routes  # Import the PDF routes
from api.index import routes as index_routes  # Import the index routes

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
app.include_router(pdf_routes.router, prefix="/api/pdf", tags=["pdf"])

# Include the index routes
app.include_router(index_routes.router, prefix="", tags=["index"])

app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
