from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api.pdf import routes as pdf_routes  # Import the PDF routes
from api.index import routes as index_routes  # Import the index routes

app = FastAPI()

# Include the PDF routes
app.include_router(pdf_routes.router, prefix="/api/pdf", tags=["pdf"])

# Include the index routes
app.include_router(index_routes.router, prefix="", tags=["index"])

app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
