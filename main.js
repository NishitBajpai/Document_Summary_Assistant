/* Document Summary Assistant - main logic */
// Ensure PDF.js worker is configured
document.addEventListener("DOMContentLoaded", () => {
  if (window["pdfjsLib"]) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
});

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileMeta = document.getElementById("fileMeta");
const loader = document.getElementById("loader");
const loaderText = document.getElementById("loaderText");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const errorBox = document.getElementById("error");
const extractedTextEl = document.getElementById("extractedText");
const summaryOutput = document.getElementById("summaryOutput");
const btnSummarize = document.getElementById("btnSummarize");
const btnDownload = document.getElementById("btnDownload");
const btnCopy = document.getElementById("btnCopy");
const btnReset = document.getElementById("btnReset");
const lengthSelect = document.getElementById("summaryLength");
const includeBullets = document.getElementById("includeBullets");
const includeKeywords = document.getElementById("includeKeywords");
const includeSuggestions = document.getElementById("includeSuggestions");

let currentFile = null;//stores the currently uploaded file.
let extractedText = "";//stores the raw text extracted from PDF or image.

// ----------- helpers -----------
function show(el){ el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }
function setError(msg){
  if(!msg){ hide(errorBox); errorBox.textContent=""; return; }
  errorBox.textContent = msg;
  show(errorBox);
}
function setLoading(on, text){
  if(on){
    loaderText.textContent = text || "Processing…";
    show(loader);
  } else {
    hide(loader);
    progress(0, true);
  }
}
function progress(pct, hideWrap=false){
  if(hideWrap){ hide(progressWrap); return; }
  show(progressWrap);
  progressBar.style.width = `${Math.max(0, Math.min(100,pct))}%`;
}
function humanSize(bytes){
  const units = ["B","KB","MB","GB"];
  let i=0, n=bytes;
  while(n>=1024 && i<units.length-1){ n/=1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

// ----------- drag & drop -----------
["dragenter","dragover"].forEach(ev => dropzone.addEventListener(ev, e => {
  e.preventDefault(); e.stopPropagation();
  dropzone.classList.add("dragover");
}));
["dragleave","drop"].forEach(ev => dropzone.addEventListener(ev, e => {
  e.preventDefault(); e.stopPropagation();
  dropzone.classList.remove("dragover");
}));
dropzone.addEventListener("drop", e => {
  const f = e.dataTransfer.files?.[0];
  if(f) handleFile(f);
});
dropzone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", e => {
  const f = e.target.files?.[0];
  if(f) handleFile(f);
});

// ----------- file handling -----------
async function handleFile(file){
  setError("");
  extractedTextEl.value = "";
  summaryOutput.textContent = "";
  btnSummarize.disabled = true;
  btnDownload.disabled = true;
  btnCopy.disabled = true;
  extractedText = "";
  currentFile = file;

  if(!file) return;
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");

  if(!(isPdf || isImage)){
    setError("Unsupported file type. Please upload a PDF or image.");
    return;
  }

  fileMeta.innerHTML = `<div class="kpi">
      <span class="chip">Name: ${file.name}</span>
      <span class="chip">Type: ${file.type || "n/a"}</span>
      <span class="chip">Size: ${humanSize(file.size)}</span>
    </div>`;
  show(fileMeta);

  try{
    setLoading(true, isPdf ? "Parsing PDF…" : "Running OCR…");
    if(isPdf){
      extractedText = await extractTextFromPDF(file);
    } else {
      extractedText = await extractTextFromImage(file);
    }
    extractedTextEl.value = extractedText.trim();
    btnSummarize.disabled = !extractedText.trim();
    btnCopy.disabled = false;
  }catch(err){
    console.error(err);
    setError("Failed to process the file. " + (err?.message || ""));
  }finally{
    setLoading(false);
  }
}

async function extractTextFromPDF(file){
  if(!window["pdfjsLib"]) throw new Error("PDF.js not loaded");
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data: buffer}).promise;
  let full = [];
  for(let p=1; p<=pdf.numPages; p++){
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items.map(it => it.str).join(" ");
    full.push(`\n\n--- Page ${p}/${pdf.numPages} ---\n${pageText}`);
    progress(Math.round((p/pdf.numPages)*100));
  }
  progress(100);
  return full.join("");
}

async function extractTextFromImage(file){
  if(!window["Tesseract"]) throw new Error("Tesseract.js not loaded");
  progress(0);
  const { createWorker } = Tesseract;
  const worker = await createWorker("eng", 1, {
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/",
    logger: m => {
      if(m.status === "recognizing text" && m.progress!=null){
        progress(Math.round(m.progress*100));
      }
    }
  });
  const { data } = await worker.recognize(file);
  await worker.terminate();
  progress(100);
  return data.text || "";
}

// ----------- summarization -----------
const STOPWORDS = new Set(("a,about,above,after,again,against,all,am,an,and,any,are,aren't,as,at,be," +
"because,been,before,being,below,between,both,but,by,could,couldn't,did,didn't,do,does,doesn't,doing,don't," +
"down,during,each,few,for,from,further,had,hadn't,has,hasn't,have,haven't,having,he,he'd,he'll,he's,her," +
"here,here's,hers,herself,him,himself,his,how,how's,i,i'd,i'll,i'm,i've,if,in,into,is,isn't,it,it's,its," +
"itself,let's,me,more,most,mustn't,my,myself,no,nor,not,of,off,on,once,only,or,other,ought,our,ours,ourselves," +
"out,over,own,same,shan't,she,she'd,she'll,she's,should,shouldn't,so,some,such,than,that,that's,the,their," +
"theirs,them,themselves,then,there,there's,these,they,they'd,they'll,they're,they've,this,those,through,to," +
"too,under,until,up,very,was,wasn't,we,we'd,we'll,we're,we've,were,weren't,what,what's,when,when's,where," +
"where's,which,while,who,who's,whom,why,why's,with,won't,would,wouldn't,you,you'd,you'll,you're, you've," +
"your,yours,yourself,yourselves").split(","));

function tokenize(text){
  return text.toLowerCase()
    .replace(/[^a-z0-9\s\-']/g," ")
    .split(/\s+/)
    .filter(Boolean);
}

function splitSentences(text){
  // Simple sentence splitter, handles periods, question/exclamation, and line breaks
  const raw = text
    .replace(/\r/g," ")
    .replace(/\n+/g," ")
    .replace(/\s+/g," ")
    .trim();
  if(!raw) return [];
  const parts = raw.split(/(?<=[\.\!\?])\s+(?=[A-Z0-9])/);
  return parts.map(s => s.trim()).filter(Boolean);
}

function wordFreq(tokens){
  const map = new Map();
  for(const t of tokens){
    if(STOPWORDS.has(t)) continue;
    if(!/^[a-z0-9][a-z0-9\-']*$/.test(t)) continue;
    map.set(t, (map.get(t)||0)+1);
  }
  return map;
}

function scoreSentences(sentences, freqMap){
  // Score by sum of word frequencies (normalized by sentence length)
  const scores = sentences.map((s, idx) => {
    const tokens = tokenize(s);
    let sum = 0;
    for(const t of tokens){
      if(freqMap.has(t)) sum += freqMap.get(t);
    }
    const norm = tokens.length ? sum / tokens.length : 0;
    return { idx, score: norm, text: s };
  });
  return scores;
}

function chooseN(totalSentences, mode){
  const min = 3, max = 20;
  const ratio = mode==="short" ? 0.06 : mode==="long" ? 0.22 : 0.12;
  const n = Math.round(totalSentences * ratio);
  return Math.max(min, Math.min(max, n));
}

function topKeywords(freqMap, k=10){
  const arr = [...freqMap.entries()].sort((a,b)=>b[1]-a[1]);
  return arr.slice(0, k).map(([w,_]) => w);
}

function readabilityFlesch(text){
  // Approximate syllable count (very rough)
  const sentences = splitSentences(text);
  const words = tokenize(text);
  const syllables = words.reduce((acc,w)=>acc + Math.max(1, (w.match(/[aeiouy]+/g)||[]).length), 0);
  const ASL = words.length ? (words.length / Math.max(1, sentences.length)) : 0; // average sentence length
  const ASW = words.length ? (syllables / words.length) : 0;                     // avg syllables per word
  // Flesch Reading Ease
  const FRE = 206.835 - 1.015*ASL - 84.6*ASW;
  return { FRE, ASL, ASW };
}

function improvementSuggestions(text){
  const sents = splitSentences(text);
  const suggestions = [];
  const { FRE, ASL } = readabilityFlesch(text);

  if(ASL > 28) suggestions.push("Sentences are long on average — split complex sentences for clarity.");
  if(FRE < 50) suggestions.push("Reading level is difficult — prefer simpler words and shorter sentences.");
  // Passive voice heuristic: 'be' forms + past participle ending with 'ed' optionally followed by 'by'
  const passiveHits = (text.match(/\b(is|are|was|were|be|been|being)\s+\w+ed(\s+by)?\b/gi) || []).length;
  if(passiveHits > 5) suggestions.push("Frequent passive voice — convert to active voice where possible.");
  // Headings heuristic: count lines that look like headings
  const headingLines = (text.match(/(^|\n)\s*(#+\s+|[A-Z][A-Z0-9 \-]{6,}\n)/g) || []).length;
  if(headingLines < Math.max(1, Math.floor(sents.length/20))) suggestions.push("Add descriptive headings/subheadings for structure.");
  // Bullets heuristic
  const bulletLines = (text.match(/(^|\n)\s*[\-\*\u2022]\s+/g) || []).length;
  if(bulletLines < 3) suggestions.push("Use bullet points or numbered lists to present key points.");

  if(!suggestions.length) suggestions.push("Looks good! No obvious structural issues detected.");
  return { suggestions, FRE: Math.round(FRE), ASL: Math.round(ASL) };
}

// ----------- UI actions -----------
btnSummarize.addEventListener("click", () => {
  const text = extractedTextEl.value.trim();
  if(!text){ setError("No text to summarize."); return; }
  const sentences = splitSentences(text);
  if(sentences.length === 0){ setError("Couldn't detect sentences to summarize."); return; }

  const freq = wordFreq(tokenize(text));
  const scored = scoreSentences(sentences, freq);
  scored.sort((a,b)=>b.score - a.score);

  const n = chooseN(sentences.length, lengthSelect.value);
  const chosen = scored.slice(0, n).sort((a,b)=>a.idx - b.idx);

  const summary = chosen.map(x => x.text).join(" ");
  const bullets = includeBullets.checked
    ? "\n\n• " + chosen.slice(0, Math.min(8, chosen.length)).map(x=>x.text).join("\n• ")
    : "";

  const keywords = includeKeywords.checked
    ? `\n\nKeywords: ${topKeywords(freq, 12).join(", ")}`
    : "";

  let suggestionsBlock = "";
  if(includeSuggestions.checked){
    const imp = improvementSuggestions(text);
    suggestionsBlock = "\n\nImprovement Suggestions:\n" + imp.suggestions.map(s => "• " + s).join("\n")
      + `\n\nReadability (Flesch): ${imp.FRE} | Avg sentence length: ${imp.ASL}`;
  }

  const output = `Summary (${lengthSelect.value}):\n${summary}${bullets}${keywords}${suggestionsBlock}`;
  summaryOutput.textContent = output;
  btnDownload.disabled = false;
  btnCopy.disabled = false;
});

btnDownload.addEventListener("click", () => {
  const blob = new Blob([summaryOutput.textContent || ""], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "summary.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

btnCopy.addEventListener("click", async () => {
  try{
    await navigator.clipboard.writeText(summaryOutput.textContent || "");
    btnCopy.textContent = "Copied!";
    setTimeout(()=>btnCopy.textContent="Copy", 900);
  }catch{
    setError("Copy failed — your browser may block clipboard access.");
  }
});

btnReset.addEventListener("click", () => {
  fileInput.value = "";
  currentFile = null;
  extractedText = "";
  extractedTextEl.value = "";
  summaryOutput.textContent = "";
  btnSummarize.disabled = true;
  btnDownload.disabled = true;
  btnCopy.disabled = true;
  hide(fileMeta);
  setError("");
});

