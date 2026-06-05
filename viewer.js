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

// ==========================================
// 2. GERENCIAMENTO DE CONFIGURAÇÕES (Storage + Fallback config.js)
// ==========================================
const DEFAULT_SETTINGS = {
    provider: 'mymemory',           // Default: gratuito, sem cadastro
    azureKey: '',
    azureRegion: 'brazilsouth'
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
}

// Inicializa o tradutor (será chamado após loadTranslatorSettings)
initTranslator();

// ==========================================
// 3. RENDERIZAÇÃO DO PDF E PERSISTÊNCIA
// ==========================================
if (BOOK_ID) {
    const fileName = decodeURIComponent(BOOK_ID).split('/').pop();
    document.getElementById('bookTitle').textContent = fileName;

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
        document.getElementById('bookTitle').textContent = "Erro ao carregar o arquivo local.";
    });
}

function renderPage(num) {
    pageRendering = true;
    document.getElementById('pageNumber').textContent = num;
    
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

// Atalhos de Teclado (Navegação por Setas e Zoom)
window.addEventListener('keydown', (e) => {
    // Evita disparar atalhos se o usuário estiver digitando em campos de texto ou mudando opções
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

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

// ==========================================
// 7. ANOTAÇÕES E HIGHLIGHTS
// ==========================================
let annotations = {
    highlights: {}, // pageNumber -> [ { color, rects: [[x,y,w,h]] } ]
    drawings: {}    // pageNumber -> [ { color, thickness, paths: [[x,y], ...] } ]
};

let isDrawMode = false;
let currentDrawColor = '#fced6e';
let currentThickness = 4;

const drawBtn = document.getElementById('drawBtn');
const drawMenu = document.getElementById('drawMenu');
const drawCanvas = document.getElementById('drawCanvas');
const drawCtx = drawCanvas.getContext('2d');
const highlightsLayer = document.getElementById('highlightsLayer');

// Carregar anotações
function loadAnnotations() {
    if (!BOOK_ID) return;
    chrome.storage.local.get([`ann_${BOOK_ID}`], (result) => {
        if (result[`ann_${BOOK_ID}`]) {
            annotations = result[`ann_${BOOK_ID}`];
        }
        renderAnnotations(currentPage);
    });
}

// Salvar anotações
function saveAnnotations() {
    if (!BOOK_ID) return;
    chrome.storage.local.set({ [`ann_${BOOK_ID}`]: annotations });
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
}

// Atualizar tamanhos quando renderiza página
const originalRenderPage = renderPage;
renderPage = function(num) {
    
    // Limpa as anotações antigas imediatamente da tela (evita o "ghosting")
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    highlightsLayer.innerHTML = '';
    
    originalRenderPage(num);
    
    // Aguarda a renderização do framework original concluir
    const checkInterval = setInterval(() => {
        if (!pageRendering) {
            clearInterval(checkInterval);
            
            // Redimensiona sobreposições pelas medidas obtidas
            drawCanvas.width = canvas.width;
            drawCanvas.height = canvas.height;
            highlightsLayer.style.width = canvas.width + 'px';
            highlightsLayer.style.height = canvas.height + 'px';
            
            // Restaura as anotações da página logo que ela existir
            renderAnnotations(num);
        }
    }, 50); 
}

// --- DESENHO ---
let isDrawing = false;
let currentPath = [];

drawBtn.addEventListener('click', (e) => {
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
});

// Seleção de cor do desenho
document.getElementById('drawColors').addEventListener('click', (e) => {
    if(e.target.classList.contains('color-btn')) {
        document.querySelectorAll('#drawColors .color-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        currentDrawColor = e.target.dataset.color;
        
        // Ativa modo desenho automaticamente
        isDrawMode = true;
        drawCanvas.classList.add('active');
        drawBtn.innerHTML = '🖍️ Ativo ▾';
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
        saveAnnotations();
    }
    renderAnnotations(currentPage); // limpa o caminho e renderiza tudo limpo
});

drawCanvas.addEventListener('mouseout', () => {
    if(isDrawing) drawCanvas.dispatchEvent(new MouseEvent('mouseup'));
});

// --- HIGHLIGHTS ---
let lastSelectionRects = [];
let lastSelectionText = '';

document.getElementById('pageWrapper').addEventListener('mouseup', (e) => {
    if (isDrawMode) return;
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
            translatedTextArea.textContent = "Traduzindo...";
            
            const translatedResult = await translator.translate(selectedText, 'en', 'pt-br');
            translatedTextArea.textContent = translatedResult;
        }
    }, 100);
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
            saveAnnotations();
            renderAnnotations(currentPage);
        } else {
             if (annotations.highlights[currentPage]) {
                // Remove destaques se a seleção de texto atual contiver ou estiver contida no texto destacado
                annotations.highlights[currentPage] = annotations.highlights[currentPage].filter(hl => 
                    !(lastSelectionText.includes(hl.text) || hl.text.includes(lastSelectionText))
                );
                saveAnnotations();
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

// Inicialização: carrega settings do storage
loadAllSettings().then(() => {
    initTranslator();
});