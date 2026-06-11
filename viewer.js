// ==========================================
// 1. INITIAL SETUP AND WORKER
// ==========================================
// PDF.js version: 4.x (update together with pdf.min.js/pdf.worker.min.js)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';

const urlParams = new URLSearchParams(window.location.search);
const BOOK_ID = urlParams.get('file');

let pdfDoc = null;
let currentPage = 1;
let currentScale = 1.5; // Default initial scale (150%)
let pageRendering = false;

const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('pageWrapper');
const textLayerEl = document.getElementById('textLayer');

// Elements for additional annotation layers
const drawCanvas = document.getElementById('drawCanvas');
const drawCtx = drawCanvas ? drawCanvas.getContext('2d') : null;
const highlightsLayer = document.getElementById('highlightsLayer');
const textAnnotationsLayer = document.getElementById('textAnnotationsLayer');

// ==========================================
// 2. SETTINGS MANAGEMENT (storage + fallback to config.js)
// ==========================================
const DEFAULT_SETTINGS = {
    provider: 'mymemory',           // Default: free provider (no API key required)
    azureKey: '',
    azureRegion: 'brazilsouth',
    targetLang: 'pt-br'             // Default target language for translations
};

let translatorSettings = { ...DEFAULT_SETTINGS };
let folderConfig = { allowlist: [], blocklist: [] };
let translator = null;
// Flag indicating whether the user explicitly changed the target language in this session
let userChangedTarget = false;

// Load settings: storage -> config.js -> defaults
async function loadAllSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['translatorSettings', 'folderConfig'], (result) => {
            // 1. Translation settings
            if (result.translatorSettings) {
                translatorSettings = { ...DEFAULT_SETTINGS, ...result.translatorSettings };
            } else if (typeof CONFIG !== 'undefined' && CONFIG.AZURE_TRANSLATOR_KEY && CONFIG.AZURE_TRANSLATOR_KEY !== 'COLE_A_SUA_CHAVE_AQUI') {
                translatorSettings = {
                    provider: 'microsoft',
                    azureKey: CONFIG.AZURE_TRANSLATOR_KEY,
                    azureRegion: CONFIG.AZURE_TRANSLATOR_REGION || 'brazilsouth'
                };
            }
            
            // 2. Folder security settings
            if (result.folderConfig) {
                folderConfig = result.folderConfig;
            }
            
            resolve();
        });
    });
}

function saveTranslatorSettings(settings) {
    translatorSettings = { ...translatorSettings, ...settings };
    chrome.storage.local.set({ translatorSettings });
    initTranslator(); 
}

function saveFolderSettings(newBlocklist) {
    folderConfig.blocklist = newBlocklist.split(',').map(s => s.trim()).filter(s => s.length > 0);
    chrome.storage.local.set({ folderConfig });
}

function initTranslator() {
    translator = new TranslatorService(translatorSettings.provider);
    // Inject Azure credentials when using Microsoft provider
    if (translatorSettings.provider === 'microsoft') {
        translator.azureKey = translatorSettings.azureKey;
        translator.azureRegion = translatorSettings.azureRegion;
    }
    console.log('[Translator] Provider:', translatorSettings.provider);
}

// Force the source-language selector to 'auto' repeatedly (workaround for browser/extension UI state restore)
function enforceAutoSource(retries = 6, interval = 150) {
    try {
        const sourceSelect = document.getElementById('sourceLangSelect');
        const swapBtn = document.getElementById('swapLangBtn');
        if (!sourceSelect) return;

        if (sourceSelect.value !== 'auto') {
            sourceSelect.value = 'auto';
        }

        if (swapBtn) {
            swapBtn.disabled = (sourceSelect.value === 'auto');
            swapBtn.title = swapBtn.disabled ? 'Impossível inverter quando Origem está em "Detectar auto".' : 'Inverter idiomas';
        }

        if (retries > 0 && sourceSelect.value !== 'auto') {
            setTimeout(() => enforceAutoSource(retries - 1, interval), interval);
        }
    } catch (e) {
        // silent
    }
}

// ==========================================
// 3. TRANSLATION SERVICE ABSTRACTION
// ==========================================
class TranslatorService {
    constructor(provider = 'mymemory') {
        this.provider = provider;
        this.azureKey = '';
        this.azureRegion = 'brazilsouth';
    }

    async translate(text, sourceLang = 'en', targetLang = 'pt') {
        if (!text) return '';

        try {
            switch(this.provider) {
                case 'mymemory':
                    return await this.useMyMemoryAPI(text, sourceLang, targetLang);
                case 'microsoft':
                    return await this.useMicrosoftAPI(text, sourceLang, targetLang);
                default:
                    throw new Error('Translation provider not supported.');
            }
        } catch (error) {
            console.error("Translation service error:", error);
            return "❌ Error connecting to translation API.";
        }
    }

    // Free provider (MyMemory) - no API key required
    async useMyMemoryAPI(text, sourceLang, targetLang) {
        const langPair = `${sourceLang}|${targetLang === 'pt-br' ? 'pt' : targetLang}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('MyMemory API error');

        const data = await response.json();
        if (data.responseData?.translatedText) {
            return data.responseData.translatedText;
        }
        throw new Error('Invalid response from MyMemory');
    }

    // Microsoft Azure Translator - requires API key
    async useMicrosoftAPI(text, sourceLang, targetLang) {
        if (!this.azureKey) {
            throw new Error('Azure key not configured. Open settings (⚙️).');
        }

        const target = targetLang === 'pt-br' ? 'pt' : targetLang;
        const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${sourceLang}&to=${target}`;

        const body = JSON.stringify([{ "Text": text }]);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': this.azureKey,
                'Ocp-Apim-Subscription-Region': this.azureRegion,
                'Content-type': 'application/json'
            },
            body: body
        });

        if (!response.ok) {
            console.error(`Microsoft API error: ${response.status}`);
            throw new Error("Error communicating with translation service");
        }

        const data = await response.json();
        if (data && data[0] && data[0].translations && data[0].translations[0]) {
            return data[0].translations[0].text;
        }
        throw new Error("Invalid response from translation service");
    }

    // Detect language (Azure when available, otherwise fallback heuristic)
    async detect(text) {
        if (!text) return '';
        // Try Azure detect if available
        if (this.provider === 'microsoft' && this.azureKey) {
            try {
                const url = 'https://api.cognitive.microsofttranslator.com/detect?api-version=3.0';
                const body = JSON.stringify([{ "Text": text }]);
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Ocp-Apim-Subscription-Key': this.azureKey,
                        'Ocp-Apim-Subscription-Region': this.azureRegion,
                        'Content-type': 'application/json'
                    },
                    body
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data[0] && data[0].language) {
                        const lang = data[0].language;
                        return (lang === 'pt') ? 'pt-br' : lang;
                    }
                }
            } catch (err) {
                console.warn('Language detection failed (Azure):', err);
            }
        }

        // Fallback: simple stopword-based heuristic for common languages
        const textLower = text.toLowerCase();
        const scores = { en: 0, es: 0, 'pt-br': 0, fr: 0, de: 0, it: 0 };
        const patterns = {
            en: [' the ', ' and ', ' is ', ' are ', ' of ', ' to ', ' in ', ' for '],
            es: [' la ', ' el ', ' que ', ' de ', ' y ', ' los ', ' las ', ' en '],
            'pt-br': [' o ', ' a ', ' que ', ' de ', ' e ', ' os ', ' as ', ' na ', ' no '],
            fr: [' le ', ' la ', ' que ', ' de ', ' et ', ' les '],
            de: [' der ', ' die ', ' und ', ' ist ', ' das '],
            it: [' che ', ' di ', ' e ', ' la ', ' il ']
        };

        for (const [lng, arr] of Object.entries(patterns)) {
            for (const p of arr) {
                const count = (textLower.split(p).length - 1);
                if (count > 0) scores[lng] += count;
            }
        }

        // pick best
        let best = 'en';
        let bestScore = 0;
        Object.entries(scores).forEach(([k, v]) => {
            if (v > bestScore) { bestScore = v; best = k; }
        });

        if (bestScore === 0) {
            // quick script checks as a last resort
            if (/[¿¡áéíóúñü]/.test(textLower)) return 'es';
            if (/[ãõáâêç]/.test(textLower)) return 'pt-br';
            return 'en';
        }

        return best;
    }
}

// ==========================================
// 3. PDF RENDERING AND PERSISTENCE
// ==========================================
function renderPage(num) {
    pageRendering = true;
    document.getElementById('pageNumber').value = num;

    // Clear previous annotations immediately from the screen (prevents "ghosting")
    if (typeof drawCtx !== 'undefined') drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    if (typeof highlightsLayer !== 'undefined') highlightsLayer.innerHTML = '';
    if (typeof textAnnotationsLayer !== 'undefined') textAnnotationsLayer.innerHTML = '';
    
    pdfDoc.getPage(num).then((page) => {
        const viewport = page.getViewport({ scale: currentScale });
        
        wrapper.style.height = viewport.height + 'px';
        wrapper.style.width = viewport.width + 'px';

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = { canvasContext: ctx, viewport: viewport };
        
        page.render(renderContext).promise.then(() => {
            textLayerEl.innerHTML = '';
            textLayerEl.style.height = viewport.height + 'px';
            textLayerEl.style.width = viewport.width + 'px';
            textLayerEl.style.setProperty('--scale-factor', viewport.scale);

            return page.getTextContent();
        }).then((textContent) => {
            return document.fonts.ready.then(() => {
                const textLayerTask = pdfjsLib.renderTextLayer({
                    textContent: textContent,
                    container: textLayerEl,
                    viewport: viewport,
                    textDivs: []
                });
                return textLayerTask.promise;
            });
        }).then(() => {
            pageRendering = false;
            saveProgress(num);

            // Resize overlay layers according to the computed viewport
            if (typeof drawCanvas !== 'undefined') {
                drawCanvas.width = canvas.width;
                drawCanvas.height = canvas.height;
                highlightsLayer.style.width = canvas.width + 'px';
                highlightsLayer.style.height = canvas.height + 'px';
                textAnnotationsLayer.style.width = canvas.width + 'px';
                textAnnotationsLayer.style.height = canvas.height + 'px';
                
                // Restore page annotations as soon as the layers are sized
                renderAnnotations(num);
            }
        }).catch(err => {
            console.error("Render error:", err);
            pageRendering = false;
        });
    });
}

function saveProgress(page) {
    const statusEl = document.getElementById('statusMsg');
    if (!statusEl) return;
    // Ensure status is visible and doesn't trigger layout shifts
    statusEl.style.opacity = '1';
    statusEl.textContent = "Saving current page...";
    try { updateStatusPosition(); } catch (e) { /* ignore */ }
    chrome.storage.local.set({ [BOOK_ID]: page }, () => {
        statusEl.textContent = "Progress saved!";
        try { updateStatusPosition(); } catch (e) { /* ignore */ }
        // Keep message briefly then fade out to avoid leaving text that could
        // cause future small layout recalculations in some browsers.
        setTimeout(() => {
            statusEl.style.opacity = '0';
            setTimeout(() => { statusEl.textContent = ''; try { updateStatusPosition(); } catch (e) {} }, 260);
        }, 700);
    });
}

// ==========================================
// 4. BUTTONS AND SIDEBAR EVENTS
// ==========================================
document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage <= 1 || pageRendering) return;
    currentPage--;
    renderPage(currentPage);
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentPage >= pdfDoc.numPages || pageRendering) return;
    currentPage++;
    renderPage(currentPage);
});

document.getElementById('pageNumber').addEventListener('change', handlePageInput);
document.getElementById('pageNumber').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.target.blur(); // Triggers change event
    }
    try { refreshToolbarHeight(); } catch (e) { /* ignore */ }
});
 

function handlePageInput(e) {
    let num = parseInt(e.target.value);
    if (isNaN(num)) num = currentPage;
    if (num < 1) num = 1;
    if (num > pdfDoc.numPages) num = pdfDoc.numPages;
    if (num !== currentPage) {
        if (!pageRendering) {
            currentPage = num;
            renderPage(currentPage);
        } else {
            e.target.value = currentPage; // reset if currently rendering to prevent bug
        }
    } else {
        e.target.value = currentPage; // Restore if out of bounds or invalid
    }
}

// Keyboard shortcuts (arrow navigation and zoom)
window.addEventListener('keydown', (e) => {
    // Prevent shortcuts while the user is typing, changing options, or editing annotations
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;

    // Arrow key navigation
    if (e.key === 'ArrowRight') {
        if (!pdfDoc || currentPage >= pdfDoc.numPages || pageRendering) return;
        currentPage++;
        renderPage(currentPage);
    } else if (e.key === 'ArrowLeft') {
        if (!pdfDoc || currentPage <= 1 || pageRendering) return;
        currentPage--;
        renderPage(currentPage);
    }

    // Zoom (Ctrl + '+' / '-')
    if (e.ctrlKey) {
        if (e.key === '+' || e.key === '=' || e.key === 'Add') {
            e.preventDefault();
            zoomIn();
        } else if (e.key === '-' || e.key === 'Subtract') {
            e.preventDefault();
            zoomOut();
        }
        // Undo / Redo (Ctrl+Z / Ctrl+Y). Ctrl+Shift+Z also performs redo.
        const k = e.key ? e.key.toLowerCase() : '';
        if (k === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
        } else if (k === 'y') {
            e.preventDefault();
            redo();
        }
    }
});

// Support zoom with Ctrl + mouse wheel
window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    }
}, { passive: false });

const sidebar = document.getElementById('translatorSidebar');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sourceTextArea = document.getElementById('sourceText');
const translatedTextArea = document.getElementById('translatedText');

closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
});

const translatorToggleBtn = document.getElementById('translatorToggleBtn');
if (translatorToggleBtn) {
    translatorToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // If opening, enforce 'Detectar auto' default to avoid restored state
        if (!sidebar.classList.contains('open')) {
            enforceAutoSource();
            sidebar.classList.add('open');
        } else {
            sidebar.classList.remove('open');
        }
        setTimeout(() => { try { refreshToolbarHeight(); } catch (e) {} }, 40);
    });
}

// Close sidebar on outside click for small screens
document.addEventListener('click', (e) => {
    const toggleBtn = document.getElementById('translatorToggleBtn');
    if (window.innerWidth <= 900 && sidebar.classList.contains('open')) {
        if (toggleBtn && toggleBtn.contains(e.target)) return;
        if (!sidebar.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

// Re-render on resize (debounced) to keep canvas and overlays aligned.
// Avoid full re-render on minor resizes to prevent flicker; only re-render
// when pdfArea width or devicePixelRatio changes significantly.

let _resizeTimeout = null;
let _lastPdfAreaWidth = (document.getElementById('pdfArea') && document.getElementById('pdfArea').clientWidth) || window.innerWidth;
let _lastDevicePixelRatio = window.devicePixelRatio || 1;

function updateStatusPosition() {
    try {
        const statusEl = document.getElementById('statusMsg');
        const toolbar = document.querySelector('.toolbar');
        const toolbarRight = document.querySelector('.toolbar-right');
        if (!statusEl || !toolbar || !toolbarRight) return;
        // Simpler: ancorar à direita e limitar largura disponível
        let buttonsWidth = 0;
        toolbarRight.querySelectorAll('button').forEach(btn => {
            const style = getComputedStyle(btn);
            const mr = parseFloat(style.marginRight) || 0;
            const ml = parseFloat(style.marginLeft) || 0;
            buttonsWidth += btn.offsetWidth + mr + ml;
        });

        const rightOffset = Math.round(buttonsWidth + 12); // spacing buffer
        const toolbarWidth = toolbar.clientWidth || toolbar.getBoundingClientRect().width;
        const paddingLeft = parseFloat(getComputedStyle(toolbar).paddingLeft) || 14;
        const paddingRight = parseFloat(getComputedStyle(toolbar).paddingRight) || 14;
        const safetyBuffer = 40;

        const maxWidth = Math.max(40, toolbarWidth - buttonsWidth - paddingLeft - paddingRight - safetyBuffer);

        statusEl.style.position = 'absolute';
        statusEl.style.top = '50%';
        statusEl.style.transform = 'translateY(-50%)';
        statusEl.style.pointerEvents = 'none';
        statusEl.style.right = rightOffset + 'px';
        statusEl.style.left = 'auto';
        statusEl.style.maxWidth = Math.min(maxWidth, 220) + 'px';
        statusEl.style.overflow = 'hidden';
        statusEl.style.textOverflow = 'ellipsis';
        statusEl.style.whiteSpace = 'nowrap';
        statusEl.style.zIndex = '1';
    } catch (err) {
        // ignore
    }
}

function refreshToolbarHeight() {
    try {
        const toolbar = document.querySelector('.toolbar');
        if (!toolbar) return;
        const h = toolbar.offsetHeight || 50;
        document.documentElement.style.setProperty('--toolbar-height', h + 'px');
        // reposition status after toolbar height update
        updateStatusPosition();
    } catch (e) {
        // ignore
    }
}

window.addEventListener('resize', () => {
    if (_resizeTimeout) clearTimeout(_resizeTimeout);
    _resizeTimeout = setTimeout(() => {
        try {
            const pdfArea = document.getElementById('pdfArea');
            const newWidth = pdfArea ? pdfArea.clientWidth : window.innerWidth;
            const dpr = window.devicePixelRatio || 1;
            const widthChanged = Math.abs(newWidth - _lastPdfAreaWidth) > 40; // threshold in px
            const dprChanged = dpr !== _lastDevicePixelRatio;

            // Reposition the status indicator and update toolbar height on all resizes (no layout effect).
            refreshToolbarHeight();

            if (widthChanged || dprChanged) {
                _lastPdfAreaWidth = newWidth;
                _lastDevicePixelRatio = dpr;
                if (pdfDoc && !pageRendering) {
                    renderPage(currentPage);
                }
            }
        } catch (e) { /* ignore if not initialized yet */ }
    }, 220);
});

// ==========================================
// 5. ZOOM CONTROLS
// ==========================================
const zoomDisplay = document.getElementById('zoomDisplay');

function zoomIn() {
    // Limit maximum zoom to 300% and prevent rapid double clicks
    if (pageRendering || currentScale >= 3.0) return; 
    
    currentScale += 0.25; // Aumenta de 25 em 25%
    zoomDisplay.textContent = Math.round(currentScale * 100) + '%';
    renderPage(currentPage);
}

function zoomOut() {
    // Limit minimum zoom to 50%
    if (pageRendering || currentScale <= 0.5) return; 
    
    currentScale -= 0.25; // Reduz de 25 em 25%
    zoomDisplay.textContent = Math.round(currentScale * 100) + '%';
    renderPage(currentPage);
}

document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
// Undo/Redo UI buttons
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
if (undoBtn) undoBtn.addEventListener('click', () => { undo(); });
if (redoBtn) redoBtn.addEventListener('click', () => { redo(); });

// ==========================================
// 7. ANNOTATIONS AND HIGHLIGHTS
// ==========================================
let annotations = {
    highlights: {}, // pageNumber -> [ { color, rects: [[x,y,w,h]] } ]
    drawings: {},   // pageNumber -> [ { color, thickness, paths: [[x,y], ...] } ]
    texts: {}       // pageNumber -> [ { text, color, x, y, fontSize } ]
};
function cloneAnnotations(obj) {
    try {
        if (typeof structuredClone === 'function') return structuredClone(obj);
    } catch (e) {}
    return JSON.parse(JSON.stringify(obj));
}

let isDrawMode = false;
let isTextMode = false;
let currentTextColor = '#ff6a6a';
let currentTextSize = 16;
let currentDrawColor = '#fced6e';
let currentThickness = 4;

const drawBtn = document.getElementById('drawBtn');
const drawMenu = document.getElementById('drawMenu');
// Undo/Redo history stacks
let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 50;
let isPerformingUndoRedo = false;
let previousAnnotationsSnapshot = null;

// Load annotations
function loadAnnotations() {
    if (!BOOK_ID) return;
    chrome.storage.local.get([`ann_${BOOK_ID}`], (result) => {
        const saved = result[`ann_${BOOK_ID}`] || {};
        annotations = {
            highlights: saved.highlights || {},
            drawings: saved.drawings || {},
            texts: saved.texts || {}
        };
        // Initialize undo/redo history with the initial state
        undoStack = [];
        redoStack = [];
        undoStack.push(cloneAnnotations(annotations));

        updateUndoRedoUI();
        renderAnnotations(currentPage);
    });
}

// Save annotations
function saveAnnotations() {
    if (!BOOK_ID) return;
    chrome.storage.local.set({ [`ann_${BOOK_ID}`]: annotations });
}

// Call when annotations change: push current state to undo stack
function updateUndoRedoUI() {
    try {
        if (typeof undoBtn !== 'undefined' && undoBtn) undoBtn.disabled = (undoStack.length <= 1 || isPerformingUndoRedo);
        if (typeof redoBtn !== 'undefined' && redoBtn) redoBtn.disabled = (redoStack.length === 0 || isPerformingUndoRedo);
    } catch (e) {
        // ignore if buttons are not available yet
    }
}

// Call when annotations change: record a new undo entry
function recordChange() {
    if (isPerformingUndoRedo) return;
    // Clear redo stack when performing a new action
    redoStack = [];
    undoStack.push(cloneAnnotations(annotations));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    updateUndoRedoUI();
}

function undo() {
    if (undoStack.length <= 1) return; // nothing to undo beyond the initial state
    isPerformingUndoRedo = true;
    const current = undoStack.pop();
    redoStack.push(cloneAnnotations(current));
    const prev = cloneAnnotations(undoStack[undoStack.length - 1]);
    annotations = prev;
    saveAnnotations();
    renderAnnotations(currentPage);
    isPerformingUndoRedo = false;
    updateUndoRedoUI();
}

function redo() {
    if (redoStack.length === 0) return;
    isPerformingUndoRedo = true;
    const next = redoStack.pop();
    undoStack.push(cloneAnnotations(next));
    annotations = cloneAnnotations(next);
    saveAnnotations();
    renderAnnotations(currentPage);
    isPerformingUndoRedo = false;
    updateUndoRedoUI();
}

// Render annotations for the current page
function renderAnnotations(pageNum) {
    if (!annotations) return;
    
    // Configure drawing canvas
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    const pageDrawings = annotations.drawings[pageNum] || [];
    pageDrawings.forEach(d => {
        if (d.paths.length < 2) return;
        drawCtx.beginPath();
        drawCtx.strokeStyle = d.color;
        drawCtx.lineWidth = d.thickness * currentScale; // Adjust stroke thickness based on zoom
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.moveTo(d.paths[0][0] * currentScale, d.paths[0][1] * currentScale);
        for(let i=1; i<d.paths.length; i++) {
            drawCtx.lineTo(d.paths[i][0] * currentScale, d.paths[i][1] * currentScale);
        }
        drawCtx.stroke();
    });

    // Render highlights
    highlightsLayer.innerHTML = '';
    const pageHighlights = annotations.highlights[pageNum] || [];
    pageHighlights.forEach((hl, index) => {
        hl.rects.forEach(rect => {
            const div = document.createElement('div');
            div.className = 'highlight-rect';
            div.style.backgroundColor = hl.color;
            div.style.left = (rect[0] * currentScale) + 'px';
            div.style.top = (rect[1] * currentScale) + 'px';
            div.style.width = (rect[2] * currentScale) + 'px';
            div.style.height = (rect[3] * currentScale) + 'px';
            div.dataset.index = index;
            highlightsLayer.appendChild(div);
        });
    });

    // Render text annotations
    textAnnotationsLayer.innerHTML = '';
    const pageTexts = annotations.texts[pageNum] || [];
    pageTexts.forEach((tData, index) => {
        const container = document.createElement('div');
        container.className = 'pdf-text-annotation-container';
        container.style.left = (tData.x * currentScale) + 'px';
        container.style.top = (tData.y * currentScale) + 'px';
        
        // Define fallback font size (16) if undefined (older annotations)
        const size = tData.fontSize || 16; 

        const div = document.createElement('div');
        div.className = 'pdf-text-annotation';
        div.style.fontSize = (size * currentScale) + 'px';
        div.style.color = tData.color;
        div.innerText = tData.text;
        div.dataset.index = index;
        
        const dragHandle = document.createElement('button');
        dragHandle.className = 'text-drag-handle';
        dragHandle.innerHTML = '⠿';
        dragHandle.title = "Move text";
        
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        dragHandle.addEventListener('mousedown', (e) => {
            if (div.isContentEditable) return;
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            
            const rect = container.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            const mouseMoveHandler = (ev) => {
                if (!isDragging) return;
                const wrapperRect = document.getElementById('pageWrapper').getBoundingClientRect();
                
                let newX = ev.clientX - wrapperRect.left - dragOffset.x;
                let newY = ev.clientY - wrapperRect.top - dragOffset.y;
                
                    // Boundaries clamp (optional but recommended)
                if (newX < 0) newX = 0;
                if (newY < 0) newY = 0;
                
                container.style.left = newX + 'px';
                container.style.top = newY + 'px';
            };
            
            const mouseUpHandler = (ev) => {
                if (!isDragging) return;
                isDragging = false;
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                
                // Save new position
                const newX = parseFloat(container.style.left) / currentScale;
                const newY = parseFloat(container.style.top) / currentScale;
                
                annotations.texts[pageNum][index].x = newX;
                annotations.texts[pageNum][index].y = newY;
                recordChange();
                saveAnnotations();
            };
            
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'text-delete-btn';
        delBtn.innerHTML = '🗑️';
        delBtn.title = "Delete text";
        
        // Clique na lixeira para excluir
        delBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Evita perder foco antes de deletar
            e.stopPropagation();
            
            // If currently editing, disable blur handler to avoid conflicts
            div.onblur = null; 
            
            annotations.texts[pageNum].splice(index, 1);
            recordChange();
            saveAnnotations();
            renderAnnotations(pageNum);
        });

        // Clicking the text itself makes it editable again (re-edit)
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            if (div.isContentEditable) return; // Já está editando

            div.contentEditable = true;
            div.classList.add('editing');
            div.focus();
            
            // Move cursor pro final
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(div);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);

            const saveEditedText = () => {
                let newText = div.innerText.trim();
                div.contentEditable = false;
                div.classList.remove('editing');

                if (newText.length > 0) {
                    annotations.texts[pageNum][index].text = newText;
                        recordChange();
                        saveAnnotations();
                } else {
                    // If the text is empty after edit, remove the annotation
                    annotations.texts[pageNum].splice(index, 1);
                        recordChange();
                        saveAnnotations();
                    renderAnnotations(pageNum);
                }
            };
            
            // Remove old event handlers to avoid stacking when toggling edit
            div.onblur = saveEditedText;
            div.onkeydown = (ev) => {
                if (ev.key === 'Escape' || (ev.key === 'Enter' && !ev.shiftKey)) {
                    ev.preventDefault();
                    div.blur(); // Salva
                }
            };
        });
        
        container.appendChild(dragHandle);
        container.appendChild(div);
        container.appendChild(delBtn);
        textAnnotationsLayer.appendChild(container);
    });
}

// --- DESENHO ---
let isDrawing = false;
let currentPath = [];

const addTextBtn = document.getElementById('addTextBtn');
const textMenu = document.getElementById('textMenu');
const textSizeDisplay = document.getElementById('textSizeDisplay');

addTextBtn.addEventListener('click', () => {
    isTextMode = !isTextMode;
    const textLayer = document.getElementById('textLayer');
    if (isTextMode) {
        addTextBtn.innerHTML = '📝 Ativo ▾';
        textMenu.classList.add('open');
        isDrawMode = false;
        drawCanvas.classList.remove('active');
        drawBtn.innerHTML = '🖍️ Desenhar ▾';
        drawMenu.classList.remove('open');
        document.getElementById('pageWrapper').style.cursor = 'text';
        document.getElementById('pageWrapper').classList.add('disable-selection');
    } else {
        addTextBtn.innerHTML = '📝 Texto ▾';
        textMenu.classList.remove('open');
        document.getElementById('pageWrapper').style.cursor = 'default';
        document.getElementById('pageWrapper').classList.remove('disable-selection');
    }
    setTimeout(() => { try { refreshToolbarHeight(); } catch (e) {} }, 60);
});

drawBtn.addEventListener('click', (e) => {
    if (isTextMode) {
        isTextMode = false;
        addTextBtn.innerHTML = '📝 Texto ▾';
        textMenu.classList.remove('open');
        document.getElementById('pageWrapper').style.cursor = 'default';
        document.getElementById('pageWrapper').classList.remove('disable-selection');
    }
    if (isDrawMode) {
        // Desativa o modo de desenho
        isDrawMode = false;
        drawCanvas.classList.remove('active');
        drawBtn.innerHTML = '🖍️ Desenhar ▾';
        drawMenu.classList.remove('open');
    } else {
        // Intercala o menu open/close
        drawMenu.classList.toggle('open');
        setTimeout(() => { try { refreshToolbarHeight(); } catch (e) {} }, 40);
    }
});

// Ativa modo de desenho ao fechar o menu (se escolhido)
document.addEventListener('click', (e) => {
    if (!drawBtn.contains(e.target) && !drawMenu.contains(e.target)) {
        drawMenu.classList.remove('open');
        setTimeout(() => { try { refreshToolbarHeight(); } catch (e) {} }, 40);
    }
    if (!addTextBtn.contains(e.target) && !textMenu.contains(e.target)) {
        if (isTextMode && e.target.closest('#pageWrapper') === null) {
             textMenu.classList.remove('open');
             setTimeout(() => { try { refreshToolbarHeight(); } catch (e) {} }, 40);
        }
    }
});

// Text color and size selection
document.getElementById('textColors').addEventListener('click', (e) => {
    if(e.target.classList.contains('color-btn')) {
        document.querySelectorAll('#textColors .color-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        currentTextColor = e.target.dataset.color;
    }
});

document.getElementById('textFontSize').addEventListener('input', (e) => {
    currentTextSize = parseInt(e.target.value);
    textSizeDisplay.textContent = currentTextSize + 'px';
});

// Drawing color selection
document.getElementById('drawColors').addEventListener('click', (e) => {
    if(e.target.classList.contains('color-btn')) {
        document.querySelectorAll('#drawColors .color-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        currentDrawColor = e.target.dataset.color;
        
        if (!isTextMode) {
            // Activate draw mode automatically only if not in text mode
            isDrawMode = true;
            drawCanvas.classList.add('active');
            drawBtn.innerHTML = '🖍️ Ativo ▾';
        }
    }
});

document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') {
        isDrawMode = false;
        drawCanvas.classList.remove('active');
        drawBtn.innerHTML = '🖍️ Desenhar ▾';
    }
});

document.getElementById('clearDrawingsBtn').addEventListener('click', () => {
    if (annotations.drawings[currentPage]) {
        annotations.drawings[currentPage] = [];
        recordChange();
        saveAnnotations();
        renderAnnotations(currentPage);
    }
});

document.getElementById('drawThickness').addEventListener('input', (e) => {
    currentThickness = parseInt(e.target.value);
});

drawCanvas.addEventListener('mousedown', (e) => {
    if (!isDrawMode) return;
    isDrawing = true;
    const rect = drawCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / currentScale;
    const y = (e.clientY - rect.top) / currentScale;
    currentPath = [[x, y]];
    
    // Start a new subpath on the drawing context so the
    // next `lineTo` does not connect to the last saved stroke on the canvas.
    if (drawCtx) {
        drawCtx.beginPath();
        drawCtx.strokeStyle = currentDrawColor;
        drawCtx.lineWidth = currentThickness * currentScale;
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.moveTo(x * currentScale, y * currentScale);
    }
});

drawCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = drawCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / currentScale;
    const y = (e.clientY - rect.top) / currentScale;
    currentPath.push([x, y]);
    
    // Feedback visual
    drawCtx.lineTo(x * currentScale, y * currentScale);
    drawCtx.strokeStyle = currentDrawColor;
    drawCtx.lineWidth = currentThickness * currentScale;
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(x * currentScale, y * currentScale);
});

drawCanvas.addEventListener('mouseup', () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentPath.length > 1) {
        if (!annotations.drawings[currentPage]) annotations.drawings[currentPage] = [];
        annotations.drawings[currentPage].push({
            color: currentDrawColor,
            thickness: currentThickness,
            paths: currentPath
        });
        recordChange();
        saveAnnotations();
    }
    renderAnnotations(currentPage); // limpa o caminho e renderiza tudo limpo
});

drawCanvas.addEventListener('mouseout', () => {
    if(isDrawing) drawCanvas.dispatchEvent(new MouseEvent('mouseup'));
});

// --- HIGHLIGHTS E TEXTOS ---
document.getElementById('pageWrapper').addEventListener('click', (e) => {
    if (!isTextMode || e.target.classList.contains('pdf-text-annotation')) return;
    
    const wrapperRect = document.getElementById('pageWrapper').getBoundingClientRect();
    const startX = (e.clientX - wrapperRect.left) / currentScale;
    const startY = (e.clientY - wrapperRect.top) / currentScale;
    
    // Choose color from currently selected in text menu
    const selectedColor = currentTextColor;
    const selectedSize = currentTextSize;

    const container = document.createElement('div');
    container.className = 'pdf-text-annotation-container';
    container.style.left = (startX * currentScale) + 'px';
    container.style.top = (startY * currentScale) + 'px';
    
    const div = document.createElement('div');
    div.contentEditable = true;
    div.className = 'pdf-text-annotation editing';
    div.style.fontSize = (selectedSize * currentScale) + 'px';
    div.style.color = selectedColor;
    
    container.appendChild(div);
    textAnnotationsLayer.appendChild(container);
    div.focus();
    
    // Focus in timeout to guarantee it handles the event loop properly
    setTimeout(() => {
        div.focus();
    }, 10);
    
    const saveNewText = () => {
        if (!container.parentElement) return; 
        let text = div.innerText.trim();
        div.contentEditable = false;
        div.classList.remove('editing');
        
        if (text.length > 0) {
            if (!annotations.texts[currentPage]) annotations.texts[currentPage] = [];
            annotations.texts[currentPage].push({
                text: text,
                color: selectedColor,
                fontSize: selectedSize,
                x: startX,
                y: startY
            });
            recordChange();
            saveAnnotations();
        }
        
        // Remove the temporary creation container and let rendering recreate a clean view
        container.remove();
        renderAnnotations(currentPage);
    };

    div.addEventListener('blur', saveNewText);
    div.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
            e.preventDefault();
            div.blur(); 
        }
    });
});

let lastSelectionRects = [];
let lastSelectionText = '';

document.getElementById('pageWrapper').addEventListener('mouseup', (e) => {
    if (isDrawMode || isTextMode) return;
    setTimeout(async () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText.length > 0) {
            const range = selection.getRangeAt(0);
            const rects = range.getClientRects();
            const wrapperRect = document.getElementById('pageWrapper').getBoundingClientRect();

            lastSelectionText = selectedText;
            lastSelectionRects = [];
            for(let rect of rects) {
                lastSelectionRects.push([
                    (rect.left - wrapperRect.left) / currentScale,
                    (rect.top - wrapperRect.top) / currentScale,
                    rect.width / currentScale,
                    rect.height / currentScale
                ]);
            }
            
            // Original sidebar behavior: when opening, ensure 'Detect auto' is set
            if (!sidebar.classList.contains('open')) {
                enforceAutoSource();
                sidebar.classList.add('open');
            }
            
            sourceTextArea.textContent = selectedText;
            await translateSelectedText(selectedText);
        }
    }, 100);
});

// Hover detection: when the user moves the mouse with text selected, try to detect language (debounced)
document.getElementById('pageWrapper').addEventListener('mousemove', (e) => {
    if (isDrawMode || isTextMode) return;
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) return;

    const sourceSelect = document.getElementById('sourceLangSelect');
    if (!sourceSelect || sourceSelect.value !== 'auto') return; // só detecta se usuário deixou em auto

    if (_detectHoverTimeout) clearTimeout(_detectHoverTimeout);
    _detectHoverTimeout = setTimeout(async () => {
        try {
            const detected = await translator.detect(selectedText);
            lastDetectedLang = detected || 'en';
            const opt = Array.from(sourceSelect.options).find(o => o.value === lastDetectedLang);
            if (opt) sourceSelect.value = lastDetectedLang;
        } catch (err) {
            // silencioso
        }
    }, 250);
});

// Sidebar highlight actions
document.getElementById('hlColors').addEventListener('click', (e) => {
    if(e.target.classList.contains('color-btn')) {
        const color = e.target.dataset.color;
        
        if (lastSelectionRects.length === 0) return;
        
        if (color !== 'none') {
            if (!annotations.highlights[currentPage]) annotations.highlights[currentPage] = [];
            annotations.highlights[currentPage].push({
                color: color,
                text: lastSelectionText,
                rects: lastSelectionRects
            });
            recordChange();
            saveAnnotations();
            renderAnnotations(currentPage);
        } else {
             if (annotations.highlights[currentPage]) {
                // Remove highlights if the current selection contains or is contained within the highlighted text
                const before = annotations.highlights[currentPage].length;
                annotations.highlights[currentPage] = annotations.highlights[currentPage].filter(hl => 
                    !(lastSelectionText.includes(hl.text) || hl.text.includes(lastSelectionText))
                );
                if (annotations.highlights[currentPage].length !== before) {
                    recordChange();
                    saveAnnotations();
                }
                renderAnnotations(currentPage);
            }
        }
        
        window.getSelection().removeAllRanges();
        lastSelectionRects = [];
    }
});

// ==========================================
// 8. SETTINGS MODAL
// ==========================================
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const cancelSettings = document.getElementById('cancelSettings');
const saveSettings = document.getElementById('saveSettings');
const providerSelect = document.getElementById('providerSelect');
const azureSettings = document.getElementById('azureSettings');
const azureRegionGroup = document.getElementById('azureRegionGroup');
const providerInfo = document.getElementById('providerInfo');
const azureKeyInput = document.getElementById('azureKey');
const azureRegionInput = document.getElementById('azureRegion');
const blocklistInput = document.getElementById('blocklistInput');

const PROVIDER_INFO = {
    mymemory: '<strong>MyMemory:</strong> Gratuito, 1000 req/dia, sem chave necessária. Ideal para uso casual.',
    microsoft: '<strong>Microsoft Azure:</strong> Requer chave de API e região. 2M chars/mês grátis no tier Free. Qualidade superior.'
};

function openSettingsModal() {
    // Preenche com valores atuais
    providerSelect.value = translatorSettings.provider;
    azureKeyInput.value = translatorSettings.azureKey;
    azureRegionInput.value = translatorSettings.azureRegion;
    blocklistInput.value = folderConfig.blocklist.join(', ');
    updateProviderUI();
    settingsModal.classList.add('open');
    setTimeout(() => { try { refreshToolbarHeight(); } catch (e) {} }, 40);
}

function closeSettingsModalFn() {
    settingsModal.classList.remove('open');
    setTimeout(() => { try { refreshToolbarHeight(); } catch (e) {} }, 40);
}

function updateProviderUI() {
    const provider = providerSelect.value;
    providerInfo.innerHTML = PROVIDER_INFO[provider];
    const showAzure = provider === 'microsoft';
    azureSettings.style.display = showAzure ? 'block' : 'none';
    azureRegionGroup.style.display = showAzure ? 'block' : 'none';
}

async function saveSettingsFn() {
    const newSettings = {
        provider: providerSelect.value,
        azureKey: azureKeyInput.value.trim(),
        azureRegion: azureRegionInput.value.trim() || 'brazilsouth'
    };

    // Basic validation for Azure settings
    if (newSettings.provider === 'microsoft' && !newSettings.azureKey) {
        alert('Por favor, insira a chave da API do Azure.');
        return;
    }

    saveTranslatorSettings(newSettings);
    saveFolderSettings(blocklistInput.value);
    closeSettingsModalFn();
    
    // Feedback visual
    const statusEl = document.getElementById('statusMsg');
    statusEl.textContent = 'Configurações salvas!';
    try { updateStatusPosition(); } catch (e) {}
    setTimeout(() => { statusEl.textContent = ''; try { updateStatusPosition(); } catch (e) {} }, 2000);
}

// Event Listeners
settingsBtn.addEventListener('click', openSettingsModal);
closeSettingsModal.addEventListener('click', closeSettingsModalFn);
cancelSettings.addEventListener('click', closeSettingsModalFn);
saveSettings.addEventListener('click', saveSettingsFn);
providerSelect.addEventListener('change', updateProviderUI);

// Fecha modal clicando fora
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModalFn();
});

// --- Language controls and translation helper ---
let lastDetectedLang = '';
let _detectHoverTimeout = null;

async function translateSelectedText(text) {
    const sourceSelect = document.getElementById('sourceLangSelect');
    const targetSelect = document.getElementById('targetLangSelect');
    if (!text) {
        translatedTextArea.textContent = '';
        return;
    }

    let sourceLang = sourceSelect ? sourceSelect.value : 'auto';
    // targetLang will be determined after possible detection so we don't lock an outdated value
    let targetLang = (targetSelect && targetSelect.value) ? targetSelect.value : (translatorSettings.targetLang || 'pt-br');

    // If Microsoft provider is selected but no Azure key, fallback to MyMemory to avoid API errors
    let activeTranslator = translator;
    if (translator && translator.provider === 'microsoft' && !translator.azureKey) {
        const statusEl = document.getElementById('statusMsg');
        statusEl.textContent = 'Azure não configurado — usando fallback MyMemory.';
        try { updateStatusPosition(); } catch (e) {}
        setTimeout(() => { statusEl.textContent = ''; try { updateStatusPosition(); } catch (e) {} }, 2500);
        activeTranslator = new TranslatorService('mymemory');
    }

    if (sourceLang === 'auto') {
        translatedTextArea.textContent = 'Detectando idioma...';
        let detected = '';
        try {
            detected = await (activeTranslator.detect ? activeTranslator.detect(text) : translator.detect(text));
        } catch (errDetect) {
            console.warn('Detect failed:', errDetect);
            detected = await translator.detect(text);
        }
        lastDetectedLang = detected || 'en';
        sourceLang = lastDetectedLang;
        // If user hasn't overridden source select, reflect detected
        if (sourceSelect && sourceSelect.value === 'auto') {
            const opt = Array.from(sourceSelect.options).find(o => o.value === sourceLang);
            if (opt) sourceSelect.value = sourceLang;
        }
        // Ensure target is different from detected language for common en <-> pt-br cases
        try {
            if (targetSelect && !userChangedTarget) {
                if (targetSelect.value === sourceLang) {
                    if (sourceLang === 'en') targetSelect.value = 'pt-br';
                    else if (sourceLang === 'pt-br') targetSelect.value = 'en';
                    else {
                        const fallback = translatorSettings.targetLang || 'pt-br';
                        targetSelect.value = (fallback === sourceLang) ? (sourceLang === 'en' ? 'pt-br' : 'en') : fallback;
                    }
                }
            }
            const swapBtnEl = document.getElementById('swapLangBtn');
            if (swapBtnEl) swapBtnEl.disabled = (sourceSelect && sourceSelect.value === 'auto');
        } catch (e) { /* silent */ }
    }

    // Recompute targetLang in case detection changed the targetSelect value above
    targetLang = (targetSelect && targetSelect.value) ? targetSelect.value : (translatorSettings.targetLang || 'pt-br');

    translatedTextArea.textContent = 'Traduzindo...';
    try {
        const result = await activeTranslator.translate(text, sourceLang, targetLang);
        translatedTextArea.textContent = result;
    } catch (err) {
        console.error('Erro na tradução:', err);
        translatedTextArea.textContent = '❌ Erro ao traduzir.';
    }
}

function initLanguageControls() {
    const langs = [
        { code: 'en', label: 'English' },
        { code: 'pt-br', label: 'Português (BR)' },
        { code: 'es', label: 'Español' },
        { code: 'fr', label: 'Français' },
        { code: 'de', label: 'Deutsch' },
        { code: 'it', label: 'Italiano' }
    ];

    const sourceSelect = document.getElementById('sourceLangSelect');
    const targetSelect = document.getElementById('targetLangSelect');
    const swapBtn = document.getElementById('swapLangBtn');

    if (!sourceSelect || !targetSelect) return; // nothing to do

    // populate: source gets 'auto' + langs, target gets only langs (no 'auto')
    sourceSelect.innerHTML = '';
    targetSelect.innerHTML = '';
    const sourceLangs = [{ code: 'auto', label: 'Detectar auto' }, ...langs];
    sourceLangs.forEach(l => {
        const o = document.createElement('option'); o.value = l.code; o.textContent = l.label; sourceSelect.appendChild(o);
    });
    langs.forEach(l => {
        const o = document.createElement('option'); o.value = l.code; o.textContent = l.label; targetSelect.appendChild(o);
    });

    // set defaults
    sourceSelect.value = 'auto';
    const savedTarget = translatorSettings.targetLang || 'pt-br';
    if (Array.from(targetSelect.options).find(o => o.value === savedTarget)) {
        targetSelect.value = savedTarget;
    } else {
        targetSelect.value = 'pt-br';
    }

    // helper to enable/disable swap when source is 'auto'
    const updateSwapDisabled = () => {
        if (swapBtn) {
            swapBtn.disabled = (sourceSelect.value === 'auto');
            swapBtn.title = swapBtn.disabled ? 'Impossível inverter quando Origem está em "Detectar auto".' : 'Inverter idiomas';
        }
    };
    updateSwapDisabled();

    // events
    sourceSelect.addEventListener('change', () => {
        updateSwapDisabled();
        // if user switches away from auto, retranslate selection
        if (lastSelectionText && sourceSelect.value !== 'auto') translateSelectedText(lastSelectionText);
    });

    targetSelect.addEventListener('change', (e) => {
        const newTarget = e.target.value;
        // user manually changed target for this session
        userChangedTarget = true;
        // persist
        saveTranslatorSettings({ targetLang: newTarget });
        if (lastSelectionText) translateSelectedText(lastSelectionText);
    });

    if (swapBtn) {
        swapBtn.addEventListener('click', () => {
            if (swapBtn.disabled) return;
            const s = sourceSelect.value;
            const t = targetSelect.value;
            // if source is auto and we have a detected language, use that
            const detected = (s === 'auto') ? (lastDetectedLang || 'en') : s;
            // swap
            sourceSelect.value = t || 'auto';
            targetSelect.value = detected || 'pt-br';
            saveTranslatorSettings({ targetLang: targetSelect.value });
            if (lastSelectionText) translateSelectedText(lastSelectionText);
        });
    }

    // Force 'Detectar auto' as the default (retrying) to avoid browser/extension state restore
    enforceAutoSource();
}

// Initialization: load settings from storage and open the PDF
loadAllSettings().then(() => {
    // Inicializa controles de idioma (sidebar) e depois o tradutor
    initLanguageControls();
    initTranslator();

    if (BOOK_ID) {
        const fileName = decodeURIComponent(BOOK_ID).split('/').pop();
        const bookTitleEl = document.getElementById('bookTitle');
        bookTitleEl.textContent = fileName;
        bookTitleEl.title = fileName;

        pdfjsLib.getDocument(BOOK_ID).promise.then((pdfDoc_) => {
            pdfDoc = pdfDoc_;
            document.getElementById('totalPages').textContent = pdfDoc.numPages;
            
            document.getElementById('nextBtn').disabled = false;
            document.getElementById('prevBtn').disabled = false;

            chrome.storage.local.get([BOOK_ID], (result) => {
                if (result[BOOK_ID] && result[BOOK_ID] <= pdfDoc.numPages) {
                    currentPage = result[BOOK_ID];
                }
                loadAnnotations();
                renderPage(currentPage);
            });
        }).catch(err => {
            console.error("Erro ao abrir PDF:", err);
                const bookTitleEl = document.getElementById('bookTitle');
                bookTitleEl.textContent = "Erro ao carregar o arquivo local.";
                bookTitleEl.title = "Erro ao carregar o arquivo local.";
        });
    }
});