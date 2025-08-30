Approach (≤200 words)

I built a static, client‑side app so it can be hosted easily and scale via any CDN. For PDFs, text is extracted in‑browser with PDF.js. For images, OCR is done with Tesseract.js, showing a live progress bar. Summarization uses a simple frequency‑based sentence scoring (TextRank‑style): tokenize, remove stopwords, compute word frequencies, score sentences by cumulative word weights normalized by length, and select the top N sentences for short/medium/long. 

Key points are surfaced as bullets (top‑scoring sentences) and **keywords** are the highest‑frequency non‑stopwords. For **improvement suggestions**, lightweight heuristics measure readability (Flesch), flag long sentences, passive‑voice patterns, and lack of headings/bullets. The UI is responsive, includes drag‑and‑drop uploads, error handling, loading states, and one‑click copy/download. Code is modular and documented inline. 

Because everything runs in the browser, no private documents leave the user’s device. Deployment is trivial on Netlify/Vercel/GitHub Pages. This satisfies the functional and UX requirements within the suggested time budget.
