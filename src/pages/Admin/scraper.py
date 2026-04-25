"""
scraper.py — Project Gutenberg scraper for The Shelf
=====================================================
Called by the Node.js backend when POST /api/admin/books/scrape is received.

Usage (standalone):
    python scraper.py --query "Jane Austen" --limit 5 --language en

Usage (imported):
    from scraper import scrape_gutenberg
    result = scrape_gutenberg(query="dickens", limit=10, language="en")
"""

import argparse
import json
import os
import re
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin, quote_plus

import requests
from bs4 import BeautifulSoup

# ── Config ──────────────────────────────────────────────────────────────────

GUTENBERG_SEARCH  = "https://www.gutenberg.org/ebooks/search/"
GUTENBERG_BASE    = "https://www.gutenberg.org"
BOOKS_DIR         = Path(os.getenv("BOOKS_DIR", "./storage/books"))
COVERS_DIR        = Path(os.getenv("COVERS_DIR", "./storage/covers"))
METADATA_DIR      = Path(os.getenv("METADATA_DIR", "./storage/metadata"))
REQUEST_DELAY     = 1.5          # seconds between requests (be polite)
TIMEOUT           = 20           # seconds per HTTP request
MAX_RETRIES       = 3

HEADERS = {
    "User-Agent": (
        "TheShelf/1.0 (public-domain EPUB library; "
        "educational project; contact: admin@theshelf.app)"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# ── Data model ───────────────────────────────────────────────────────────────

@dataclass
class BookMeta:
    gutenberg_id:  int
    title:         str
    author:        str
    language:      str      = "en"
    genre:         str      = ""
    description:   str      = ""
    epub_url:      str      = ""       # server-local path after download
    cover_url:     str      = ""       # server-local path after download
    epub_source:   str      = ""       # original Gutenberg URL
    cover_source:  str      = ""       # original Gutenberg URL
    subjects:      list     = field(default_factory=list)

# ── HTTP helper ──────────────────────────────────────────────────────────────

def _get(url: str, stream: bool = False) -> Optional[requests.Response]:
    """GET with retry/back-off. Returns None on permanent failure."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, stream=stream)
            if r.status_code == 200:
                return r
            if r.status_code in (404, 403):
                return None          # don't retry client errors
            print(f"[warn] HTTP {r.status_code} for {url} (attempt {attempt})")
        except requests.RequestException as exc:
            print(f"[warn] {exc} for {url} (attempt {attempt})")
        if attempt < MAX_RETRIES:
            time.sleep(REQUEST_DELAY * attempt)
    return None

# ── Search Gutenberg ─────────────────────────────────────────────────────────

def search_gutenberg(query: str, language: str = "en", limit: int = 10) -> list[int]:
    """
    Return up to `limit` Gutenberg book IDs matching the query.
    Paginates automatically if needed.
    """
    ids: list[int] = []
    page = 1

    while len(ids) < limit:
        params = f"?query={quote_plus(query)}&lang={language}&page={page}"
        url    = GUTENBERG_SEARCH + params
        print(f"[search] {url}")

        resp = _get(url)
        if resp is None:
            print("[error] Could not reach Gutenberg search.")
            break

        soup = BeautifulSoup(resp.text, "html.parser")

        # Each result is an <li class="booklink"> with an <a> pointing to /ebooks/<id>
        items = soup.select("li.booklink a[href]")
        if not items:
            break                    # no more results

        for a in items:
            href = a["href"]
            m    = re.search(r"/ebooks/(\d+)", href)
            if m:
                ids.append(int(m.group(1)))
            if len(ids) >= limit:
                break

        # Check if a next page exists
        next_btn = soup.select_one("a[title='Go to the next page of results']")
        if not next_btn or len(ids) >= limit:
            break
        page += 1
        time.sleep(REQUEST_DELAY)

    return ids[:limit]

# ── Book detail page ─────────────────────────────────────────────────────────

def _extract_metadata(soup: BeautifulSoup, book_id: int) -> BookMeta:
    """Parse the /ebooks/<id> detail page into a BookMeta."""
    title  = soup.select_one("h1[itemprop='name']")
    author = soup.select_one("a[itemprop='creator']")

    # Subjects → derive a simple genre
    subject_tags = soup.select("td[property='dcterms:subject'] a")
    subjects     = [t.get_text(strip=True) for t in subject_tags]
    genre        = _infer_genre(subjects)

    # Language
    lang_tag = soup.select_one("td[itemprop='inLanguage']")
    language = lang_tag.get_text(strip=True).lower()[:2] if lang_tag else "en"

    # Description (Gutenberg rarely has one; use subjects as fallback)
    desc_tag    = soup.select_one("div.description")
    description = desc_tag.get_text(strip=True) if desc_tag else "; ".join(subjects[:5])

    return BookMeta(
        gutenberg_id = book_id,
        title        = title.get_text(strip=True)  if title  else f"Book {book_id}",
        author       = author.get_text(strip=True) if author else "Unknown",
        language     = language,
        genre        = genre,
        description  = description,
        subjects     = subjects,
    )


def _infer_genre(subjects: list[str]) -> str:
    """Map raw Gutenberg subjects to a simple genre label."""
    mapping = {
        "fiction":       "fiction",
        "novel":         "fiction",
        "short stories": "fiction",
        "poetry":        "poetry",
        "drama":         "drama",
        "history":       "history",
        "science":       "science",
        "philosophy":    "philosophy",
        "biography":     "biography",
        "travel":        "travel",
        "adventure":     "adventure",
        "mystery":       "mystery",
        "horror":        "horror",
        "romance":       "romance",
    }
    combined = " ".join(subjects).lower()
    for keyword, genre in mapping.items():
        if keyword in combined:
            return genre
    return "non-fiction"


def _find_epub_url(soup: BeautifulSoup) -> Optional[str]:
    """Find the best EPUB download link on the detail page."""
    # Prefer 'epub3' → 'epub' → anything with .epub
    for pattern in [r"epub3", r"epub\.epub", r"\.epub"]:
        for a in soup.select("a[href]"):
            href = a.get("href", "")
            if re.search(pattern, href, re.IGNORECASE) and "images" not in href:
                return urljoin(GUTENBERG_BASE, href)
    return None


def _find_cover_url(soup: BeautifulSoup) -> Optional[str]:
    """Find the cover image URL."""
    img = soup.select_one("img.cover-art, img[src*='cover']")
    if img and img.get("src"):
        return urljoin(GUTENBERG_BASE, img["src"])
    # Fallback: any image in the page header area
    img = soup.select_one("div.page_content img[src]")
    if img:
        return urljoin(GUTENBERG_BASE, img["src"])
    return None

# ── File download helpers ─────────────────────────────────────────────────────

def _download_file(url: str, dest: Path) -> bool:
    """Stream a remote file to disk. Returns True on success."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        print(f"[skip] {dest.name} already on disk.")
        return True
    resp = _get(url, stream=True)
    if resp is None:
        return False
    try:
        with open(dest, "wb") as fh:
            for chunk in resp.iter_content(chunk_size=65536):
                fh.write(chunk)
        print(f"[saved] {dest}")
        return True
    except OSError as exc:
        print(f"[error] Cannot write {dest}: {exc}")
        dest.unlink(missing_ok=True)
        return False


def _safe_filename(text: str, max_len: int = 60) -> str:
    slug = re.sub(r"[^\w\s-]", "", text.lower())
    slug = re.sub(r"[\s-]+", "-", slug).strip("-")
    return slug[:max_len]

# ── Main scrape logic ─────────────────────────────────────────────────────────

def scrape_gutenberg(
    query:    str,
    limit:    int  = 10,
    language: str  = "en",
) -> dict:
    """
    Main entry point called by the Node.js backend.

    Returns a dict matching the /api/admin/books/scrape response schema:
    {
        "message": "...",
        "added":   <int>,
        "skipped_duplicates": <int>,
        "failed":  <int>,
        "books_added": [{"book_id": "...", "title": "..."}, ...]
    }

    Files are saved to disk; the caller (Node.js) is responsible for
    inserting the returned metadata into MongoDB.
    """
    BOOKS_DIR.mkdir(parents=True, exist_ok=True)
    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    METADATA_DIR.mkdir(parents=True, exist_ok=True)

    added:    list[dict] = []
    skipped:  int        = 0
    failed:   int        = 0

    print(f"\n{'='*60}")
    print(f"  Scraping Gutenberg | query='{query}' limit={limit} lang={language}")
    print(f"{'='*60}\n")

    book_ids = search_gutenberg(query, language, limit)
    if not book_ids:
        return {
            "message": "No results found on Project Gutenberg.",
            "added":   0, "skipped_duplicates": 0, "failed": 0,
            "books_added": [],
        }

    for book_id in book_ids:
        print(f"[book] Processing Gutenberg ID {book_id}")
        time.sleep(REQUEST_DELAY)

        # ── Already downloaded? ──────────────────────────────────────
        meta_file = METADATA_DIR / f"{book_id}.json"
        if meta_file.exists():
            print(f"  → Duplicate, skipping.")
            skipped += 1
            continue

        # ── Fetch detail page ────────────────────────────────────────
        detail_url  = f"{GUTENBERG_BASE}/ebooks/{book_id}"
        detail_resp = _get(detail_url)
        if detail_resp is None:
            print(f"  → Could not fetch detail page.")
            failed += 1
            continue

        soup = BeautifulSoup(detail_resp.text, "html.parser")
        meta = _extract_metadata(soup, book_id)

        slug = _safe_filename(f"{meta.author}-{meta.title}")

        # ── Find and download EPUB ────────────────────────────────────
        epub_src = _find_epub_url(soup)
        if epub_src is None:
            print(f"  → No EPUB found.")
            failed += 1
            continue

        epub_dest = BOOKS_DIR / f"{slug}.epub"
        time.sleep(REQUEST_DELAY)
        if not _download_file(epub_src, epub_dest):
            print(f"  → EPUB download failed.")
            failed += 1
            continue

        meta.epub_source = epub_src
        meta.epub_url    = str(epub_dest)

        # ── Cover (best-effort) ───────────────────────────────────────
        cover_src = _find_cover_url(soup)
        if cover_src:
            ext        = Path(cover_src).suffix or ".jpg"
            cover_dest = COVERS_DIR / f"{slug}{ext}"
            time.sleep(REQUEST_DELAY)
            if _download_file(cover_src, cover_dest):
                meta.cover_source = cover_src
                meta.cover_url    = str(cover_dest)

        # ── Save metadata JSON (Node.js reads this) ───────────────────
        meta_dict = asdict(meta)
        meta_file.write_text(json.dumps(meta_dict, indent=2, ensure_ascii=False))
        print(f"  ✓ '{meta.title}' by {meta.author}")

        added.append({
            "book_id":     f"pending-{book_id}",   # replaced by Mongo _id after insert
            "title":       meta.title,
            "author":      meta.author,
            "genre":       meta.genre,
            "language":    meta.language,
            "description": meta.description,
            "epub_url":    meta.epub_url,
            "cover_url":   meta.cover_url,
            "gutenberg_id": meta.gutenberg_id,
        })

    total = len(book_ids)
    print(f"\n  Done — {len(added)}/{total} added, {skipped} skipped, {failed} failed\n")

    return {
        "message":            f"Scrape job completed. Processed {total} result(s).",
        "added":              len(added),
        "skipped_duplicates": skipped,
        "failed":             failed,
        "books_added":        added,
    }

# ── CLI entry point ───────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Project Gutenberg scraper for The Shelf")
    parser.add_argument("--query",    required=True,         help="Search term (title, author, or genre)")
    parser.add_argument("--limit",    type=int, default=10,  help="Max books to ingest (default: 10)")
    parser.add_argument("--language", default="en",          help="Language code (default: en)")
    parser.add_argument("--output",   default=None,          help="Write JSON result to this file")
    args = parser.parse_args()

    result = scrape_gutenberg(
        query    = args.query,
        limit    = args.limit,
        language = args.language,
    )

    output_json = json.dumps(result, indent=2, ensure_ascii=False)
    print(output_json)

    if args.output:
        Path(args.output).write_text(output_json, encoding="utf-8")
        print(f"\n[done] Result written to {args.output}")


if __name__ == "__main__":
    main()
