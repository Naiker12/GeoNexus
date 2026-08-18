import re
from typing import Dict, List


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> List[Dict]:
    """Divide texto en chunks por palabras, preservando marcador de pagina si existe."""
    pages = re.split(r"\[PAGINA (\d+)\]\n", text)
    segments: list[tuple[int, str]] = []

    if len(pages) > 1:
        current_page = 1
        for index, value in enumerate(pages):
            if index == 0:
                if value.strip():
                    segments.append((current_page, value.strip()))
            elif index % 2 == 1:
                current_page = int(value)
            elif value.strip():
                segments.append((current_page, value.strip()))
    else:
        segments.append((1, text))

    chunks: List[Dict] = []
    chunk_index = 0
    word_chunk_size = max(1, chunk_size // 6)
    word_overlap = max(0, overlap // 6)
    step = word_chunk_size - word_overlap if word_chunk_size > word_overlap else word_chunk_size

    for page_number, segment_text in segments:
        words = segment_text.split()
        for start in range(0, len(words), step):
            chunk_words = words[start : start + word_chunk_size]
            if not chunk_words:
                continue
            chunks.append(
                {
                    "chunk_index": chunk_index,
                    "content": " ".join(chunk_words),
                    "token_count": len(chunk_words),
                    "page_number": page_number,
                }
            )
            chunk_index += 1

    return chunks
