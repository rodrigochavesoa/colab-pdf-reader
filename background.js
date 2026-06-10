// Allowed and blocked folders configuration (loaded from chrome.storage.local)
let folderConfig = {
  allowlist: [],  // If empty, allow all paths (except those in blocklist)
  blocklist: []   // Folders that are always blocked
};

// Load folder configuration from storage on startup
chrome.storage.local.get(['folderConfig'], (result) => {
  if (result.folderConfig) {
    folderConfig = result.folderConfig;
  }
});

// Listen for configuration changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.folderConfig) {
    folderConfig = changes.folderConfig.newValue;
  }
});

function isPathAllowed(fileUrl) {
  try {
    const url = new URL(fileUrl);
    const pathname = decodeURIComponent(url.pathname);
    
    // Check blocklist first (highest priority)
    for (const blocked of folderConfig.blocklist) {
      if (pathname.toLowerCase().includes(blocked.toLowerCase())) {
        return false;
      }
    }
    
    // If allowlist is not empty, ensure the path appears in the allowlist
    if (folderConfig.allowlist.length > 0) {
      for (const allowed of folderConfig.allowlist) {
        if (pathname.toLowerCase().includes(allowed.toLowerCase())) {
          return true;
        }
      }
      return false; // Not in allowlist
    }
    
    // Empty allowlist: allow all paths (except those in blocklist)
    return true;
  } catch (e) {
    console.warn('Erro ao validar caminho:', e);
    return true; // Em caso de erro, permite por segurança
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Detect URL changes and process only local PDF files
  if (changeInfo.url && changeInfo.url.startsWith("file://") && changeInfo.url.toLowerCase().endsWith(".pdf")) {
    
    // Check whether the file path is allowed
    if (!isPathAllowed(changeInfo.url)) {
      console.log('PDF blocked by folder configuration:', changeInfo.url);
      return;
    }
    
    const extensionViewerUrl = chrome.runtime.getURL("viewer.html");
    
    // Prevent redirect loop: only redirect when the tab is not already using our viewer
    if (!changeInfo.url.startsWith(extensionViewerUrl)) {
      const customViewerUrl = `${extensionViewerUrl}?file=${encodeURIComponent(changeInfo.url)}`;
      
      // Redireciona a aba para o nosso simulador/viewer
      chrome.tabs.update(tabId, { url: customViewerUrl });
    }
  }
});