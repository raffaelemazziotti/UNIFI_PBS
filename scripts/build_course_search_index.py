#!/usr/bin/env python3
"""Render the course and build the compact JSON index used by its slide search."""

from __future__ import annotations

import argparse
import html
import json
import subprocess
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs"
INDEX_PATH = OUTPUT_DIR / "search-data" / "course-search-index.json"
PAGES = (
    "1_ns_development.html",
    "2_neurogenesis.html",
    "3_circuit_development.html",
    "4_methods.html",
    "5_neuroplasticity.html",
    "6_experience.html",
    "7_parental_care.html",
)


class SlideParser(HTMLParser):
    """Extract direct Reveal.js slides without requiring third-party packages."""

    def __init__(self, page: str) -> None:
        super().__init__(convert_charrefs=True)
        self.page = page
        self.div_depth = 0
        self.slides_depth: int | None = None
        self.current: dict[str, object] | None = None
        self.section_depth = 0
        self.heading_depth = 0
        self.skip_depth = 0
        self.slides: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "div":
            self.div_depth += 1
            if "slides" in attributes.get("class", "").split():
                self.slides_depth = self.div_depth
        elif tag == "section" and self.slides_depth == self.div_depth and self.current is None:
            slide_id = attributes.get("id")
            if slide_id:
                self.current = {"href": f"{self.page}#/{slide_id}", "title": "Untitled slide", "text": []}
                self.section_depth = 1
                return

        if self.current is not None:
            if tag == "section":
                self.section_depth += 1
            elif tag in {"h1", "h2", "h3"}:
                self.heading_depth += 1
            elif tag in {"script", "style"}:
                self.skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if self.current is not None:
            if tag in {"script", "style"} and self.skip_depth:
                self.skip_depth -= 1
            elif tag in {"h1", "h2", "h3"} and self.heading_depth:
                self.heading_depth -= 1
            elif tag == "section":
                self.section_depth -= 1
                if self.section_depth == 0:
                    text = " ".join(self.current["text"]).strip()
                    self.current["text"] = text
                    self.slides.append(self.current)  # type: ignore[arg-type]
                    self.current = None

        if tag == "div":
            if self.slides_depth == self.div_depth:
                self.slides_depth = None
            self.div_depth -= 1

    def handle_data(self, data: str) -> None:
        if self.current is None or self.skip_depth:
            return
        text = " ".join(html.unescape(data).split())
        if not text:
            return
        self.current["text"].append(text)  # type: ignore[index]
        if self.heading_depth:
            title = self.current["title"]
            self.current["title"] = f"{title} {text}".replace("Untitled slide ", "")  # type: ignore[index]


def extract_slides(page: str) -> list[dict[str, str]]:
    parser = SlideParser(page)
    parser.feed((OUTPUT_DIR / page).read_text(encoding="utf-8"))
    return parser.slides


def main() -> None:
    argument_parser = argparse.ArgumentParser(description=__doc__)
    argument_parser.add_argument("--skip-render", action="store_true", help="Build from the existing files in docs/ without running Quarto first.")
    args = argument_parser.parse_args()

    if not args.skip_render:
        subprocess.run(["quarto", "render"], cwd=ROOT, check=True)

    slides = [slide for page in PAGES for slide in extract_slides(page)]
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps({"slides": slides}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(slides)} slides to {INDEX_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
