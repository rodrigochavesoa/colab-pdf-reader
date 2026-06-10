// ==========================================
// 1. CONFIGURAÇÃO INICIAL E WORKER
// ==========================================
// PDF.js version: 4.x (atualizar conforme pdf.min.js/pdf.worker.min.js)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';

const urlParams = new URLSearchParams(window.location.search);
const BOOK_ID = urlParams.get('file');

let pdfDoc = null;
let currentPage = 1;
let currentScale = 1.5; // Escala inicial padrão (150%)
let pageRendering = false;

const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('pageWrapper');
const textLayerEl = document.getElementById('textLayer');

// Elementos das novas camadas de anotação
const drawCanvas = document.getElementById('drawCanvas');
const drawCtx = drawCanvas ? drawCanvas.getContext('2d') : null;
const highlightsLayer = document.getElementById('highlightsLayer');
const textAnnotationsLayer = document.getElementById('textAnnotationsLayer');

// ==========================================
// 2. GERENCIAMENTO DE CONFIGURAÇÕES (Storage + Fallback config.js)
// ==========================================
const DEFAULT_SETTINGS = {
    provider: 'mymemory',           // Default: gratuito, sem cadastro
    azureKey: '',
    azureRegion: 'brazilsouth',
    targetLang: 'pt-br'             // idioma alvo padrão para tradução
};

let translatorSettings = { ...DEFAULT_SETTINGS };
let folderConfig = { allowlist: [], blocklist: [] };
let translator = null;

// Carrega configurações: storage > config.js > defaults
async function loadAllSettings() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['translatorSettings', 'folderConfig'], (result) => {
            // 1. Tradução
            if (result.translatorSettings) {
                translatorSettings = { ...DEFAULT_SETTINGS, ...result.translatorSettings };
            } else if (typeof CONFIG !== 'undefined' && CONFIG.AZURE_TRANSLATOR_KEY && CONFIG.AZURE_TRANSLATOR_KEY !== 'COLE_A_SUA_CHAVE_AQUI') {
                translatorSettings = {
                    provider: 'microsoft',
                    azureKey: CONFIG.AZURE_TRANSLATOR_KEY,
                    azureRegion: CONFIG.AZURE_TRANSLATOR_REGION || 'brazilsouth'
                };
            }
            
            // 2. Segurança (Pastas)
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
    // Injeta credenciais Azure se necessário
    if (translatorSettings.provider === 'microsoft') {
        translator.azureKey = translatorSettings.azureKey;
        translator.azureRegion = translatorSettings.azureRegion;
    }
    console.log('[Translator] Provider:', translatorSettings.provider);
}

// ==========================================
// 3. ARQUITETURA DESACOPLADA DE TRADUÇÃO
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
                    throw new Error('Provedor de tradução não suportado.');
            }
        } catch (error) {
            console.error("Erro no serviço de tradução:", error);
            return "❌ Erro ao conectar com a API de tradução.";
        }
    }

    // Provedor Gratuito (MyMemory) - Sem chave necessária
    async useMyMemoryAPI(text, sourceLang, targetLang) {
        const langPair = `${sourceLang}|${targetLang === 'pt-br' ? 'pt' : targetLang}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro na API MyMemory');

        const data = await response.json();
        if (data.responseData?.translatedText) {
            return data.responseData.translatedText;
        }
        throw new Error('Resposta inválida da MyMemory');
    }

    // Microsoft Azure Translator - Requer chave
    async useMicrosoftAPI(text, sourceLang, targetLang) {
        if (!this.azureKey) {
            throw new Error('Chave do Azure não configurada. Abra as configurações (⚙️).');
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
            console.error(`Erro na API Microsoft: ${response.status}`);
            throw new Error("Erro ao comunicar com o serviço de tradução");
        }

        const data = await response.json();
        if (data && data[0] && data[0].translations && data[0].translations[0]) {
            return data[0].translations[0].text;
        }
        throw new Error("Resposta inválida do serviço de tradução");
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
            // quick script checks as last resort
            if (/[¿¡áéíóúñü]/.test(textLower)) return 'es';
            if (/[ãõáâêç]/.test(textLower)) return 'pt-br';
            return 'en';
        }

        return best;
    }
}

// ==========================================
// 3. RENDERIZAÇÃO DO PDF E PERSISTÊNCIA
// ==========================================
function renderPage(num) {
    pageRendering = true;
    document.getElementById('pageNumber').value = num;

    // Limpa as anotações antigas imediatamente da tela (evita o "ghosting")
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

            // Redimensiona sobreposições pelas medidas obtidas
            if (typeof drawCanvas !== 'undefined') {
                drawCanvas.width = canvas.width;
                drawCanvas.height = canvas.height;
                highlightsLayer.style.width = canvas.width + 'px';
                highlightsLayer.style.height = canvas.height + 'px';
                textAnnotationsLayer.style.width = canvas.width + 'px';
                textAnnotationsLayer.style.height = canvas.height + 'px';
                
                // Restaura as anotações da página logo que ela existir
                renderAnnotations(num);
            }
        }).catch(err => {
            console.error("Erro na renderização:", err);
            pageRendering = false;
        });
    });
}

function saveProgress(page) {
    const statusEl = document.getElementById('statusMsg');
    statusEl.textContent = "Guardando página...";
    chrome.storage.local.set({ [BOOK_ID]: page }, () => {
        statusEl.textContent = "Progresso salvo!";
    });
}

// ==========================================
// 4. EVENTOS DOS BOTÕES E DA SIDEBAR
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

// Atalhos de Teclado (Navegação por Setas e Zoom)
window.addEventListener('keydown', (e) => {
    // Evita disparar atalhos se o usuário estiver digitando em campos de texto, mudando opções ou editando anotações
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;

    // Navegação por Setas
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
        // Undo / Redo (Ctrl+Z / Ctrl+Y). Ctrl+Shift+Z também refaz.
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

// Suporte a zoom com Ctrl + Scroll do mouse
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
        sidebar.classList.toggle('open');
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

// Re-render on resize (debounced) to keep canvas and overlays aligned
let _resizeTimeout = null;
window.addEventListener('resize', () => {
    if (_resizeTimeout) clearTimeout(_resizeTimeout);
    _resizeTimeout = setTimeout(() => {
        try {
            if (pdfDoc && !pageRendering) {
                // Force a re-render to recalc canvas sizes and overlay layers
                renderPage(currentPage);
            }
        } catch (e) { /* ignore if not initialized yet */ }
    }, 160);
});

// ==========================================
// 5. CONTROLES DE ZOOM
// ==========================================
const zoomDisplay = document.getElementById('zoomDisplay');

function zoomIn() {
    // Limita o zoom máximo a 300% e evita cliques duplos rápidos
    if (pageRendering || currentScale >= 3.0) return; 
    
    currentScale += 0.25; // Aumenta de 25 em 25%
    zoomDisplay.textContent = Math.round(currentScale * 100) + '%';
    renderPage(currentPage);
}

function zoomOut() {
    // Limita o zoom mínimo a 50%
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
// 7. ANOTAÇÕES E HIGHLIGHTS
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

// Carregar anotações
function loadAnnotations() {
    if (!BOOK_ID) return;
    chrome.storage.local.get([`ann_${BOOK_ID}`], (result) => {
        const saved = result[`ann_${BOOK_ID}`] || {};
        annotations = {
            highlights: saved.highlights || {},
            drawings: saved.drawings || {},
            texts: saved.texts || {}
        };
        // Inicializa histórico de undo/redo com o estado inicial
        undoStack = [];
        redoStack = [];
        undoStack.push(cloneAnnotations(annotations));

        updateUndoRedoUI();
        renderAnnotations(currentPage);
    });
}

// Salvar anotações
function saveAnnotations() {
    if (!BOOK_ID) return;
    chrome.storage.local.set({ [`ann_${BOOK_ID}`]: annotations });
}

// Usa quando uma ação muda as anotações: push no undo stack
function updateUndoRedoUI() {
    try {
        if (typeof undoBtn !== 'undefined' && undoBtn) undoBtn.disabled = (undoStack.length <= 1 || isPerformingUndoRedo);
        if (typeof redoBtn !== 'undefined' && redoBtn) redoBtn.disabled = (redoStack.length === 0 || isPerformingUndoRedo);
    } catch (e) {
        // ignore if buttons not available yet
    }
}

// Usa quando uma ação muda as anotações: push no undo stack
function recordChange() {
    if (isPerformingUndoRedo) return;
    // Limpa redo ao fazer nova ação
    redoStack = [];
    undoStack.push(cloneAnnotations(annotations));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    updateUndoRedoUI();
}

function undo() {
    if (undoStack.length <= 1) return; // nada a desfazer além do estado inicial
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

// Renderizar anotações da página atual
function renderAnnotations(pageNum) {
    if (!annotations) return;
    
    // Configura canvas de desenho
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    const pageDrawings = annotations.drawings[pageNum] || [];
    pageDrawings.forEach(d => {
        if (d.paths.length < 2) return;
        drawCtx.beginPath();
        drawCtx.strokeStyle = d.color;
        drawCtx.lineWidth = d.thickness * currentScale; // Ajusta espessura pelo zoom
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.moveTo(d.paths[0][0] * currentScale, d.paths[0][1] * currentScale);
        for(let i=1; i<d.paths.length; i++) {
            drawCtx.lineTo(d.paths[i][0] * currentScale, d.paths[i][1] * currentScale);
        }
        drawCtx.stroke();
    });

    // Configura highlights
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

    // Configura Textos
    textAnnotationsLayer.innerHTML = '';
    const pageTexts = annotations.texts[pageNum] || [];
    pageTexts.forEach((tData, index) => {
        const container = document.createElement('div');
        container.className = 'pdf-text-annotation-container';
        container.style.left = (tData.x * currentScale) + 'px';
        container.style.top = (tData.y * currentScale) + 'px';
        
        // Define fallback fontsize (16) if undefined (older texts)
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
        dragHandle.title = "Mover texto";
        
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
                
                // Boundaries clamp (optional but good)
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
        delBtn.title = "Excluir texto";
        
        // Clique na lixeira para excluir
        delBtn.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Evita perder foco antes de deletar
            e.stopPropagation();
            
            // Se estiver editando, desativa o blur pra não sobrepor
            div.onblur = null; 
            
            annotations.texts[pageNum].splice(index, 1);
            recordChange();
            saveAnnotations();
            renderAnnotations(pageNum);
        });

        // Clique no próprio texto o torna editável novamente (re-edição)
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
                    // Texto ficou vazio, exclui a anotação
                    annotations.texts[pageNum].splice(index, 1);
                        recordChange();
                        saveAnnotations();
                    renderAnnotations(pageNum);
                }
            };
            
            // Remove antigos eventos pra não empilhar caso clique fora e dentro de novo
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
    }
});

// Ativa modo de desenho ao fechar o menu (se escolhido)
document.addEventListener('click', (e) => {
    if (!drawBtn.contains(e.target) && !drawMenu.contains(e.target)) {
        drawMenu.classList.remove('open');
    }
    if (!addTextBtn.contains(e.target) && !textMenu.contains(e.target)) {
        if (isTextMode && e.target.closest('#pageWrapper') === null) {
             textMenu.classList.remove('open');
        }
    }
});

// Seleção de cor e tamanho do texto
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

// Seleção de cor do desenho
document.getElementById('drawColors').addEventListener('click', (e) => {
    if(e.target.classList.contains('color-btn')) {
        document.querySelectorAll('#drawColors .color-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        currentDrawColor = e.target.dataset.color;
        
        if (!isTextMode) {
            // Ativa modo desenho automaticamente apenas se não estiver no modo texto
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
    
    // Inicia um novo subpath no contexto de desenho para evitar que o
    // próximo `lineTo` conecte ao último traço salvo no canvas.
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
        
        // Remove o container de criação e deixa a renderização recriar limpo
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
            
            // Lógica lateral original
            if (!sidebar.classList.contains('open')) {
                sidebar.classList.add('open');
            }
            
            sourceTextArea.textContent = selectedText;
            await translateSelectedText(selectedText);
        }
    }, 100);
});

// Hover detection: quando o usuário passa o mouse com um texto selecionado, tenta detectar o idioma (debounced)
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

// Ações do painel lateral de Highlight
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
                // Remove destaques se a seleção de texto atual contiver ou estiver contida no texto destacado
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
// 8. MODAL DE CONFIGURAÇÕES
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
}

function closeSettingsModalFn() {
    settingsModal.classList.remove('open');
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

    // Validação básica para Azure
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
    setTimeout(() => statusEl.textContent = '', 2000);
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
    const targetLang = (targetSelect && targetSelect.value) ? targetSelect.value : (translatorSettings.targetLang || 'pt-br');

    // If Microsoft provider is selected but no Azure key, fallback to MyMemory to avoid API errors
    let activeTranslator = translator;
    if (translator && translator.provider === 'microsoft' && !translator.azureKey) {
        const statusEl = document.getElementById('statusMsg');
        statusEl.textContent = 'Azure não configurado — usando fallback MyMemory.';
        setTimeout(() => { statusEl.textContent = ''; }, 2500);
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
    }

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
}

// Inicialização: carrega settings do storage e abre o PDF
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