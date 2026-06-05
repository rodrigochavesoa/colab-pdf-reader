// Configuração de pastas permitidas/bloqueadas (carregada do storage)
let folderConfig = {
  allowlist: [],  // Se vazio, permite todas (exceto blocklist)
  blocklist: []   // Pastas sempre bloqueadas
};

// Carrega configuração do storage ao iniciar
chrome.storage.local.get(['folderConfig'], (result) => {
  if (result.folderConfig) {
    folderConfig = result.folderConfig;
  }
});

// Escuta mudanças na configuração
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.folderConfig) {
    folderConfig = changes.folderConfig.newValue;
  }
});

function isPathAllowed(fileUrl) {
  try {
    const url = new URL(fileUrl);
    const pathname = decodeURIComponent(url.pathname);
    
    // Verifica blocklist primeiro (prioridade máxima)
    for (const blocked of folderConfig.blocklist) {
      if (pathname.toLowerCase().includes(blocked.toLowerCase())) {
        return false;
      }
    }
    
    // Se allowlist não estiver vazia, verifica se está na lista
    if (folderConfig.allowlist.length > 0) {
      for (const allowed of folderConfig.allowlist) {
        if (pathname.toLowerCase().includes(allowed.toLowerCase())) {
          return true;
        }
      }
      return false; // Não está na allowlist
    }
    
    // Allowlist vazia = permite tudo (exceto blocklist)
    return true;
  } catch (e) {
    console.warn('Erro ao validar caminho:', e);
    return true; // Em caso de erro, permite por segurança
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Verifica se a URL mudou e se é um arquivo PDF local
  if (changeInfo.url && changeInfo.url.startsWith("file://") && changeInfo.url.toLowerCase().endsWith(".pdf")) {
    
    // Verifica se o caminho está permitido
    if (!isPathAllowed(changeInfo.url)) {
      console.log('PDF bloqueado pela configuração de pastas:', changeInfo.url);
      return;
    }
    
    const extensionViewerUrl = chrome.runtime.getURL("viewer.html");
    
    // Evita loop infinito: só redireciona se a aba já não estiver no nosso viewer
    if (!changeInfo.url.startsWith(extensionViewerUrl)) {
      const customViewerUrl = `${extensionViewerUrl}?file=${encodeURIComponent(changeInfo.url)}`;
      
      // Redireciona a aba para o nosso simulador/viewer
      chrome.tabs.update(tabId, { url: customViewerUrl });
    }
  }
});