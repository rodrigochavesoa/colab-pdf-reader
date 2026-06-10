PS C:\Colab_Developer\project_edge> git show aa2acb1

commit aa2acb14af4af2177f9850ecb0906b2928bd8fb5

Author: rodrigochavesoa <rodrigo.chavesoa@gmail.com>

Date:   Wed Jun 10 00:40:00 2026 -0300



    FEAT: Adiciona funcionalidade de alternância para a barra lateral e ajustes responsivos na interface



diff --git a/viewer.html b/viewer.html

index 06f3d9c..851a5af 100644

--- a/viewer.html

+++ b/viewer.html

@@ -28,18 +28,22 @@

         

         .toolbar {

             height: 50px; background-color: #1e1e1e;

-            display: flex; align-items: center; gap: 15px;

+            display: flex; align-items: center; justify-content: space-between; gap: 12px;

             box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10; flex-shrink: 0;

-            padding: 0 20px; 

+            padding: 0 14px; position: relative;

         }

         .book-title { 

-            font-size: 14px; flex: 1; min-width: 0;

-            max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

+            font-size: 14px; min-width: 0;

:

commit aa2acb14af4af2177f9850ecb0906b2928bd8fb5

Author: rodrigochavesoa <rodrigo.chavesoa@gmail.com>

Date:   Wed Jun 10 00:40:00 2026 -0300



    FEAT: Adiciona funcionalidade de alternância para a barra lateral e ajustes responsivos na interface



diff --git a/viewer.html b/viewer.html

:

commit aa2acb14af4af2177f9850ecb0906b2928bd8fb5

Author: rodrigochavesoa <rodrigo.chavesoa@gmail.com>

Date:   Wed Jun 10 00:40:00 2026 -0300



    FEAT: Adiciona funcionalidade de alternância para a barra lateral e ajustes responsivos na interface



diff --git a/viewer.html b/viewer.html

index 06f3d9c..851a5af 100644

--- a/viewer.html

+++ b/viewer.html

@@ -28,18 +28,22 @@

         

         .toolbar {

             height: 50px; background-color: #1e1e1e;

-            display: flex; align-items: center; gap: 15px;

+            display: flex; align-items: center; justify-content: space-between; gap: 12px;

             box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10; flex-shrink: 0;

-            padding: 0 20px; 

:...skipping...

commit aa2acb14af4af2177f9850ecb0906b2928bd8fb5

Author: rodrigochavesoa <rodrigo.chavesoa@gmail.com>

Date:   Wed Jun 10 00:40:00 2026 -0300



    FEAT: Adiciona funcionalidade de alternância para a barra lateral e ajustes responsivos na interface



diff --git a/viewer.html b/viewer.html

index 06f3d9c..851a5af 100644

--- a/viewer.html

+++ b/viewer.html

@@ -28,18 +28,22 @@

         

         .toolbar {

             height: 50px; background-color: #1e1e1e;

-            display: flex; align-items: center; gap: 15px;

+            display: flex; align-items: center; justify-content: space-between; gap: 12px;

             box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10; flex-shrink: 0;

-            padding: 0 20px; 

+            padding: 0 14px; position: relative;

         }

         .book-title { 

-            font-size: 14px; flex: 1; min-width: 0;

-            max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

+            font-size: 14px; min-width: 0;

+            max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

         }

         .controls-center {

-            display: flex; align-items: center; gap: 15px;

:

commit aa2acb14af4af2177f9850ecb0906b2928bd8fb5

Author: rodrigochavesoa <rodrigo.chavesoa@gmail.com>

Date:   Wed Jun 10 00:40:00 2026 -0300



    FEAT: Adiciona funcionalidade de alternância para a barra lateral e ajustes responsivos na interface



diff --git a/viewer.html b/viewer.html

index 06f3d9c..851a5af 100644

--- a/viewer.html

+++ b/viewer.html

@@ -28,18 +28,22 @@

         

         .toolbar {

             height: 50px; background-color: #1e1e1e;

-            display: flex; align-items: center; gap: 15px;

+            display: flex; align-items: center; justify-content: space-between; gap: 12px;

             box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10; flex-shrink: 0;

-            padding: 0 20px; 

+            padding: 0 14px; position: relative;

         }

         .book-title { 

-            font-size: 14px; flex: 1; min-width: 0;

-            max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

+            font-size: 14px; min-width: 0;

+            max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

         }

         .controls-center {

-            display: flex; align-items: center; gap: 15px;

-            position: absolute; left: 50%; transform: translateX(-50%);

...skipping...

Author: rodrigochavesoa <rodrigo.chavesoa@gmail.com>

Date:   Wed Jun 10 00:40:00 2026 -0300



    FEAT: Adiciona funcionalidade de alternância para a barra lateral e ajustes responsivos na interface



diff --git a/viewer.html b/viewer.html

index 06f3d9c..851a5af 100644

--- a/viewer.html

+++ b/viewer.html

@@ -28,18 +28,22 @@

         

         .toolbar {

             height: 50px; background-color: #1e1e1e;

-            display: flex; align-items: center; gap: 15px;

+            display: flex; align-items: center; justify-content: space-between; gap: 12px;

             box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10; flex-shrink: 0;

-            padding: 0 20px; 

+            padding: 0 14px; position: relative;

         }

         .book-title { 

-            font-size: 14px; flex: 1; min-width: 0;

-            max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

+            font-size: 14px; min-width: 0;

+            max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

         }

         .controls-center {

-            display: flex; align-items: center; gap: 15px;

-            position: absolute; left: 50%; transform: translateX(-50%);

+            display: flex; align-items: center; gap: 12px; justify-content: center; min-width: 0;

         }

+        .toolbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 0 0 auto; }

+        .toolbar-right { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 0 0 auto; }

+        .controls-center { display: flex; align-items: center; gap: 12px; justify-content: center; min-width: 0; flex: 1 1 auto; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; }

+        .controls-center::-webkit-scrollbar{height:6px}

+        .controls-center::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}

         .page-info { font-size: 18px; font-weight: bold; color: #00ca4e; }

         .page-input { 

             width: 60px; background: #1e1e1e; border: 1px solid #3e3e42; color: #00ca4e; 

@@ -47,7 +51,7 @@

         }

         .page-input:focus { outline: none; border-color: #00ca4e; background: #252526; }

         .page-input::-webkit-inner-spin-button, .page-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

-        button { background-color: #fafbfc; color: rgb(94, 92, 92); border: none; padding: 6px 15px; cursor: pointer; border-radius: 4px; font-weight: bold; }

+        button { background-color: #fafbfc; color: rgb(94, 92, 92); border: none; padding: 6px 10px; cursor: pointer; border-radius: 4px; font-weight: bold; }

:

-            padding: 0 20px; 

+            padding: 0 14px; position: relative;

         }

         .book-title { 

-            font-size: 14px; flex: 1; min-width: 0;

-            max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

+            font-size: 14px; min-width: 0;

+            max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

         }

         .controls-center {

-            display: flex; align-items: center; gap: 15px;

-            position: absolute; left: 50%; transform: translateX(-50%);

+            display: flex; align-items: center; gap: 12px; justify-content: center; min-width: 0;

         }

+        .toolbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 0 0 auto; }

+        .toolbar-right { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 0 0 auto; }

+        .controls-center { display: flex; align-items: center; gap: 12px; justify-content: center; min-width: 0; flex: 1 1 auto; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; }

+        .controls-center::-webkit-scrollbar{height:6px}

+        .controls-center::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}

         .page-info { font-size: 18px; font-weight: bold; color: #00ca4e; }

         .page-input { 

             width: 60px; background: #1e1e1e; border: 1px solid #3e3e42; color: #00ca4e; 

@@ -47,7 +51,7 @@

         }

         .page-input:focus { outline: none; border-color: #00ca4e; background: #252526; }

         .page-input::-webkit-inner-spin-button, .page-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

-        button { background-color: #fafbfc; color: rgb(94, 92, 92); border: none; padding: 6px 15px; cursor: pointer; border-radius: 4px; font-weight: bold; }

+        button { background-color: #fafbfc; color: rgb(94, 92, 92); border: none; padding: 6px 10px; cursor: pointer; border-radius: 4px; font-weight: bold; }

         button:hover { background-color: #c9e8ff; }

         button:disabled { background-color: #555; cursor: not-allowed; }

 

@@ -243,62 +247,111 @@

         .btn-secondary { background: #3e3e42; color: #ddd; }

         .btn-secondary:hover { background: #4e4e52; }

         .provider-info { font-size: 12px; color: #888; margin-top: 8px; padding: 10px; background: #1e1e1e; border-radius: 4px; border: 1px solid #3e3e42; }

+        

+        /* --- RESPONSIVE ADJUSTMENTS --- */

+        @media (max-width: 900px) {

+            padding: 0 14px; position: relative;

         }

         .book-title { 

-            font-size: 14px; flex: 1; min-width: 0;

-            max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

+            font-size: 14px; min-width: 0;

+            max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #aaa; 

         }

         .controls-center {

-            display: flex; align-items: center; gap: 15px;

-            position: absolute; left: 50%; transform: translateX(-50%);

+            display: flex; align-items: center; gap: 12px; justify-content: center; min-width: 0;

         }

+        .toolbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 0 0 auto; }

+        .toolbar-right { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 0 0 auto; }

+        .controls-center { display: flex; align-items: center; gap: 12px; justify-content: center; min-width: 0; flex: 1 1 auto; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; }

+        .controls-center::-webkit-scrollbar{height:6px}

+        .controls-center::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}

         .page-info { font-size: 18px; font-weight: bold; color: #00ca4e; }

         .page-input { 

             width: 60px; background: #1e1e1e; border: 1px solid #3e3e42; color: #00ca4e; 

@@ -47,7 +51,7 @@

         }

         .page-input:focus { outline: none; border-color: #00ca4e; background: #252526; }

         .page-input::-webkit-inner-spin-button, .page-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

-        button { background-color: #fafbfc; color: rgb(94, 92, 92); border: none; padding: 6px 15px; cursor: pointer; border-radius: 4px; font-weight: bold; }

+        button { background-color: #fafbfc; color: rgb(94, 92, 92); border: none; padding: 6px 10px; cursor: pointer; border-radius: 4px; font-weight: bold; }

         button:hover { background-color: #c9e8ff; }

         button:disabled { background-color: #555; cursor: not-allowed; }

 

@@ -243,62 +247,111 @@

         .btn-secondary { background: #3e3e42; color: #ddd; }

         .btn-secondary:hover { background: #4e4e52; }

         .provider-info { font-size: 12px; color: #888; margin-top: 8px; padding: 10px; background: #1e1e1e; border-radius: 4px; border: 1px solid #3e3e42; }

+        

+        /* --- RESPONSIVE ADJUSTMENTS --- */

+        @media (max-width: 900px) {

+            .toolbar { flex-wrap: wrap; height: auto; padding: 8px; }

+            .toolbar-left { order: 1; }

+            .controls-center { order: 2; width: 100%; justify-content: center; margin-top: 6px; }

+            .toolbar-right { order: 3; }

+            .book-title { width: 100%; text-align: center; max-width: none; margin: 6px 0; }

+            .page-info { display: none; }

+            .page-input { width: 48px; }

+

+            /* Make sidebar an overlay on small screens */

+            .sidebar {

+                position: fixed;

+                right: 10px;

+                top: 60px;

+                height: calc(100% - 70px);

+                width: auto;

+                max-width: 92%;

+                transform: translateX(110%);

+                transition: transform 0.25s ease;

+                border-left: none;

+                border-radius: 8px;

+                z-index: 120;

+                box-shadow: 0 8px 30px rgba(0,0,0,0.6);

+                overflow: auto;

+            }

+            .sidebar.open { transform: translateX(0); }

+

+            .pdf-area { padding: 12px; }

+            .page-wrapper { max-width: 100%; width: auto; }

+            canvas { max-width: 100%; height: auto; }

+

+            .draw-menu, .draw-menu.open, #textMenu {

+                position: fixed; left: 8px; top: 58px; z-index: 200; width: 260px;

+            }

+

+            /* Make toolbar buttons more compact on narrow screens */

+            .toolbar button { padding: 6px 8px; font-size: 13px; }

+            .controls-center button { padding: 6px 8px; }

+

+            .sidebar-header { padding: 12px; }

+            .close-btn { font-size: 20px; }

+        }

     </style>

     <script src="pdf.min.js"></script>

 </head>

 <body>

    <div class="toolbar">

-        <button id="drawBtn" title="Anotações Livre">🖍️ Desenhar ▾</button>

-        <button id="addTextBtn" title="Adicionar Texto" style="margin-left: -5px;">📝 Texto ▾</button>

-        <div class="draw-menu" id="drawMenu">

-            <label>Cores</label>

-            <div class="color-picker" id="drawColors">

-                <div class="color-btn selected" style="background: var(--hl-yellow)" data-color="#fced6e"></div>

-                <div class="color-btn" style="background: var(--hl-green)" data-color="#7cfb62"></div>

-                <div class="color-btn" style="background: var(--hl-blue)" data-color="#70d8ff"></div>

-                <div class="color-btn" style="background: var(--hl-red)" data-color="#ff6a6a"></div>

-                <div class="color-btn" style="background: var(--hl-black)" data-color="#000000"></div>

-            </div>

-            <label style="margin-top: 10px;">Espessura</label>

-            <input type="range" class="thickness-slider" id="drawThickness" min="1" max="10" value="4">

-            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #888;">

-                <span>Fino</span><span>Grosso</span>

-            </div>

-            <button id="clearDrawingsBtn" style="margin-top: 15px; padding: 5px; font-size: 12px; background: #e74c3c; color: white;">🗑️ Limpar Desenhos da Página</button>

-        </div>

+        <div class="toolbar-left">

+            <button id="drawBtn" title="Anotações Livre">🖍️ Desenhar ▾</button>

+            <button id="addTextBtn" title="Adicionar Texto">📝 Texto ▾</button>

 

-        <div class="draw-menu" id="textMenu" style="left: 135px;">

-            <label>Cor do Texto</label>

-            <div class="color-picker" id="textColors">

-                <div class="color-btn" style="background: var(--hl-yellow)" data-color="#fced6e"></div>

-                <div class="color-btn" style="background: var(--hl-green)" data-color="#7cfb62"></div>

-                <div class="color-btn" style="background: var(--hl-blue)" data-color="#70d8ff"></div>

-                <div class="color-btn selected" style="background: var(--hl-red)" data-color="#ff6a6a"></div>

-                <div class="color-btn" style="background: var(--hl-black)" data-color="#000000"></div>

+            <div class="draw-menu" id="drawMenu">

+                <label>Cores</label>

+                <div class="color-picker" id="drawColors">

+                    <div class="color-btn selected" style="background: var(--hl-yellow)" data-color="#fced6e"></div>

+                    <div class="color-btn" style="background: var(--hl-green)" data-color="#7cfb62"></div>

+                    <div class="color-btn" style="background: var(--hl-blue)" data-color="#70d8ff"></div>

+                    <div class="color-btn" style="background: var(--hl-red)" data-color="#ff6a6a"></div>

+                    <div class="color-btn" style="background: var(--hl-black)" data-color="#000000"></div>

+                </div>

+                <label style="margin-top: 10px;">Espessura</label>

+                <input type="range" class="thickness-slider" id="drawThickness" min="1" max="10" value="4">

+                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #888;">

+                    <span>Fino</span><span>Grosso</span>

+                </div>

+                <button id="clearDrawingsBtn" style="margin-top: 15px; padding: 5px; font-size: 12px; background: #e74c3c; color: white;">🗑️ Limpar Desenhos da Página</button>

             </div>

-            <label style="margin-top: 10px;">Tamanho da Fonte</label>

-            <input type="range" class="thickness-slider" id="textFontSize" min="10" max="64" value="16">

-            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #888;">

-                <span>Pequeno</span><span id="textSizeDisplay" style="font-weight:bold; color: white;">16px</span><span>Grande</span>

+

+            <div class="draw-menu" id="textMenu" style="left: 135px;">

+                <label>Cor do Texto</label>

+                <div class="color-picker" id="textColors">

+                    <div class="color-btn" style="background: var(--hl-yellow)" data-color="#fced6e"></div>

+                    <div class="color-btn" style="background: var(--hl-green)" data-color="#7cfb62"></div>

+                    <div class="color-btn" style="background: var(--hl-blue)" data-color="#70d8ff"></div>

+                    <div class="color-btn selected" style="background: var(--hl-red)" data-color="#ff6a6a"></div>

+                    <div class="color-btn" style="background: var(--hl-black)" data-color="#000000"></div>

+                </div>

+                <label style="margin-top: 10px;">Tamanho da Fonte</label>

+                <input type="range" class="thickness-slider" id="textFontSize" min="10" max="64" value="16">

+                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #888;">

+                    <span>Pequeno</span><span id="textSizeDisplay" style="font-weight:bold; color: white;">16px</span><span>Grande</span>

+                </div>

             </div>

         </div>

-        <span class="book-title" id="bookTitle" style="margin-left: 15px;">Carregando livro...</span>

-        

+

         <div class="controls-center">

+            <span class="book-title" id="bookTitle">Carregando livro...</span>

             <button id="zoomOutBtn" title="Reduzir Zoom">➖</button>

             <span id="zoomDisplay" style="color: white; font-weight: bold; width: 45px; text-align: center;">150%</span>

             <button id="zoomInBtn" title="Aumentar Zoom">➕</button>

-            

+

             <button id="prevBtn" disabled>⬅️ Anterior</button>

             <span class="page-info">Pág: <input type="number" id="pageNumber" value="1" min="1" class="page-input"> / <span id="totalPages">?</span></span>

             <button id="nextBtn" disabled>Próxima ➡️</button>

             <button id="undoBtn" title="Desfazer (Ctrl+Z)" style="margin-left:8px;">↶</button>

             <button id="redoBtn" title="Refazer (Ctrl+Y)">↷</button>

         </div>

-        

-        <span style="font-size: 12px; color: #888; margin-left: auto; margin-right: 15px;" id="statusMsg"></span>

-        

-        <button id="settingsBtn" title="Configurações de Tradução" style="padding: 6px 10px; font-size: 16px;">⚙️</button>

+

+        <div class="toolbar-right">

+            <span style="font-size: 12px; color: #888; margin-right: 8px;" id="statusMsg"></span>

+            <button id="translatorToggleBtn" title="Leitura e Tradução" style="padding: 6px 10px; font-size: 16px; margin-right:6px;">🌐</button>

+            <button id="settingsBtn" title="Configurações de Tradução" style="padding: 6px 10px; font-size: 16px;">⚙️</button>

+        </div>

     </div>

     

     <div class="main-layout">

diff --git a/viewer.js b/viewer.js

index 57dff4e..1fa4faf 100644

--- a/viewer.js

+++ b/viewer.js

@@ -397,6 +397,39 @@ closeSidebarBtn.addEventListener('click', () => {

     sidebar.classList.remove('open');

 });

 

+const translatorToggleBtn = document.getElementById('translatorToggleBtn');

+if (translatorToggleBtn) {

+    translatorToggleBtn.addEventListener('click', (e) => {

+        e.stopPropagation();

+        sidebar.classList.toggle('open');

+    });

+}

+

+// Close sidebar on outside click for small screens

+document.addEventListener('click', (e) => {

+    const toggleBtn = document.getElementById('translatorToggleBtn');

+    if (window.innerWidth <= 900 && sidebar.classList.contains('open')) {

+        if (toggleBtn && toggleBtn.contains(e.target)) return;

+        if (!sidebar.contains(e.target)) {

+            sidebar.classList.remove('open');

+        }

+    }

+});

+

+// Re-render on resize (debounced) to keep canvas and overlays aligned

+let _resizeTimeout = null;

+window.addEventListener('resize', () => {

+    if (_resizeTimeout) clearTimeout(_resizeTimeout);

+    _resizeTimeout = setTimeout(() => {

+        try {

+            if (pdfDoc && !pageRendering) {

+                // Force a re-render to recalc canvas sizes and overlay layers

+                renderPage(currentPage);

+            }

+        } catch (e) { /* ignore if not initialized yet */ }

+    }, 160);

+});

+

 // ==========================================

 // 5. CONTROLES DE ZOOM

 // ==========================================

@@ -1158,7 +1191,7 @@ async function translateSelectedText(text) {

 

 function initLanguageControls() {

     const langs = [

-        { code: 'auto', label: 'Detectar automaticamente' },

+        { code: 'auto', label: 'Detectar auto' },

         { code: 'en', label: 'English' },

         { code: 'pt-br', label: 'Português (BR)' },

         { code: 'es', label: 'Español' },

(END) 

