from io import BytesIO

from pypdf import PdfReader


def extract_pdf_text(file_bytes: bytes) -> str:
    if not file_bytes:
        return ""

    try:
        reader = PdfReader(BytesIO(file_bytes))

        pages = []

        for page in reader.pages:
            text = page.extract_text()

            if text:
                pages.append(text.strip())

        return "\n\n".join(pages).strip()

    except Exception as e:
        raise ValueError(f"Unable to extract PDF text: {str(e)}")


def extract_text_content(text: str) -> str:
    if not text:
        return ""

    return text.strip()