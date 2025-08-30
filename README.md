# Document Summary Assistant

A fast, client‑side web app that:
- Accepts **PDF** and **image** files
- Extracts text via **PDF.js** (PDF parsing) or **Tesseract.js** (OCR)
- Generates **smart summaries** with selectable length (short/medium/long)
- Highlights **key points**, extracts **keywords**, and suggests **improvements**
- Zero backend. Deploy anywhere.

## Quick Start

1. **Download** this folder and open `index.html` locally (or use “Live Server” in VS Code).
2. Or **deploy** to Netlify/Vercel/GitHub Pages (static hosting). No server needed.

## How it Works

- **PDFs** are parsed in the browser using PDF.js; text per page is concatenated.
- **Images** are OCR’d using Tesseract.js (English included by default).
- **Summarizer** uses a frequency‑based sentence scoring (TextRank‑style) and lets you pick the desired length. It also extracts top keywords and runs heuristics for improvement suggestions (readability, passive voice, structure).

## Tech

- HTML/CSS/JS (no build step)
- PDF.js, Tesseract.js via CDN

## Notes

- For other languages in OCR, load appropriate language traineddata with Tesseract.js.
- Very large PDFs/Images may take longer in the browser; progress is shown.

## License

MIT — see `LICENSE`.
