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

document.getElementById('zoomInBtn').addEventListener('click', () => {
    // Limita o zoom máximo a 300% e evita cliques duplos rápidos
    if (pageRendering || currentScale >= 3.0) return; 
    
    currentScale += 0.25; // Aumenta de 25 em 25%
    zoomDisplay.textContent = Math.round(currentScale * 100) + '%';
    renderPage(currentPage);
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
    // Limita o zoom mínimo a 50%
    if (pageRendering || currentScale <= 0.5) return; 
    
    currentScale -= 0.25; // Reduz de 25 em 25%
    zoomDisplay.textContent = Math.round(currentScale * 100) + '%';
    renderPage(currentPage);
});

// O Gatilho
document.getElementById('pageWrapper').addEventListener('mouseup', () => {
    setTimeout(async () => {
        const selectedText = window.getSelection().toString().trim();
        
        if (selectedText.length > 0) {
            if (!sidebar.classList.contains('open')) {
                sidebar.classList.add('open');
            }
            
            // Usamos textContent em vez de value
            sourceTextArea.textContent = selectedText;
            translatedTextArea.textContent = "Traduzindo...";
            
            // Chama a classe de tradução
            const translatedResult = await translator.translate(selectedText, 'en', 'pt-br');
            
            // Usamos textContent em vez de value
            translatedTextArea.textContent = translatedResult;
        }
    }, 100);
});

// ==========================================
// 6. MODAL DE CONFIGURAÇÕES
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