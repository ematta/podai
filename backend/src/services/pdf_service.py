from pypdf import PdfReader
from typing import List, Dict
from dataclasses import dataclass
import os
import re

# PDF processing classes and functions here...

@dataclass
class TableCell:
    text: str
    row_span: int = 1
    col_span: int = 1

class PDFElement:
    def to_markdown(self) -> str:
        raise NotImplementedError

class TextBlock(PDFElement):
    def __init__(self, text: str, style: Dict):
        self.text = text
        self.style = style
        
    def to_markdown(self) -> str:
        return self.text

class Table(PDFElement):
    def __init__(self, cells: List[List[TableCell]]):
        self.cells = cells
        
    def to_markdown(self) -> str:
        markdown = []
        for row in self.cells:
            markdown.append("| " + " | ".join(cell.text for cell in row) + " |")
            if len(markdown) == 1:  # Add header separator
                markdown.append("| " + " | ".join(["---"] * len(row)) + " |")
        return "\n".join(markdown)

class Image(PDFElement):
    def __init__(self, image_data: bytes, filename: str, caption: str = ""):
        self.image_data = image_data
        self.filename = filename
        self.caption = caption
        
    def save(self, base_path: str):
        os.makedirs(base_path, exist_ok=True)
        path = os.path.join(base_path, self.filename)
        with open(path, "wb") as f:
            f.write(self.image_data)
            
    def to_markdown(self) -> str:
        return f"![{self.caption}]({self.filename})"

class Footnote(PDFElement):
    def __init__(self, ref_id: str, content: str):
        self.ref_id = ref_id
        self.content = content
        
    def to_markdown(self) -> str:
        return f"[^{self.ref_id}]: {self.content}"

def process_text(text: str) -> List[PDFElement]:
    elements: List[PDFElement] = []
    blocks = text.split('\n\n')  # Split into paragraphs
    for block in blocks:
        cleaned = clean_text(block)
        if cleaned:
            elements.append(TextBlock(cleaned, {}))
    return elements

def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
    text = text.strip()
    return text

def process_tables(page) -> List[Table]:
    tables = []
    table_data = page.extract_tables()
    for table in table_data:
        cells = []
        for row in table:
            cell_row = [TableCell(str(cell)) for cell in row]
            cells.append(cell_row)
        tables.append(Table(cells))
    return tables
