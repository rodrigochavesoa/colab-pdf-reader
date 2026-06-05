# 🤝 Guia de Contribuição - Colab PDF Reader & Translator

Obrigado por considerar contribuir para o **Colab PDF Reader & Translator**! Este documento fornece diretrizes e informações essenciais para ajudar você a fazer uma contribuição significativa ao projeto.

---

## 📖 Índice

- [Código de Conduta](#-código-de-conduta)
- [Como Começar](#-como-começar)
- [Reportando Bugs](#-reportando-bugs)
- [Sugerindo Features](#-sugerindo-features)
- [Processo de Contribuição](#-processo-de-contribuição)
- [Padrões de Código](#-padrões-de-código)
- [Testes e QA](#-testes-e-qa)
- [Documentação](#-documentação)
- [Processo de Pull Request](#-processo-de-pull-request)
- [Licensing](#-licensing)
- [Dúvidas ou Precisa de Ajuda?](#-dúvidas-ou-precisa-de-ajuda)

---

## 🌟 Código de Conduta

Nossa comunidade é construída sobre os valores de **responsabilidade, empatia, honestidade** e inclusão. Esperamos que todos os contribuidores:

- ✅ Sejam **respeitosos** e **inclusivos** com pessoas de todas as origens
- ✅ Valorizem **empatia** nas discussões e feedback
- ✅ Comuniquem com **honestidade** e **transparência**
- ✅ Focalizem **resolver o problema real**, não apenas criar features
- ✅ Deem feedback construtivo e bem-intencionado

Comportamentos que **não são tolerados**:
- Linguagem ofensiva ou discriminatória
- Assédio de qualquer forma
- Comportamento que prejudique a comunidade
- Má-fé ou desonestidade

Se você presenciar ou sofrer qualquer violação, entre em contato através do email de suporte: [Colab Developer](https://rodrigochavesoa.github.io/Colab_Developer/#contact)

---

## 🚀 Como Começar

### Pré-requisitos

Antes de começar, certifique-se de ter:

- **Git** instalado e configurado
- **GitHub account** para fazer fork e criar pull requests
- **Google Chrome** ou **Microsoft Edge** (v90+) para testar a extensão
- **Conhecimento básico** em:
  - JavaScript (ES6+)
  - APIs de Navegador (Chrome Extensions)
  - HTML/CSS
  - Git e GitHub workflow

### Setup do Ambiente Local

1. **Faça um Fork** do repositório
   ```bash
   # Acesse https://github.com/rodrigochavesoa/colab-pdf-reader
   # Clique em "Fork" no canto superior direito
   ```

2. **Clone seu fork** localmente
   ```bash
   git clone https://github.com/seu-usuario/colab-pdf-reader.git
   cd colab-pdf-reader
   ```

3. **Adicione o repositório original como upstream** (para manter sincronizado)
   ```bash
   git remote add upstream https://github.com/rodrigochavesoa/colab-pdf-reader.git
   ```

4. **Instale no Modo Desenvolvedor** (para testar localmente)
   - Abra `chrome://extensions` (Chrome) ou `edge://extensions` (Edge)
   - Ative **"Modo do Desenvolvedor"** (canto superior direito)
   - Clique em **"Carregar expandida"** (Load unpacked)
   - Selecione a pasta do projeto clonado
   - ⚠️ **Importante:** Ative "Permitir acesso a URLs de arquivo" nos detalhes da extensão

5. **Verifique o setup** testando a extensão com um PDF local

### 🛠️ Empacotamento e Build para Produção

Para testar o processo de build ou gerar o ficheiro final para submissão às lojas, utilizamos o `web-ext`. Não é necessário instalar globalmente, pode usar via `npx`:

```bash
# Comando padrão para gerar o pacote .zip
npx web-ext build --source-dir "." --artifacts-dir "../project-colab-pdf-reader_dist" --ignore-files "config.js" ".webextignore"
```

**Parâmetros importantes:**
- `--source-dir`: Pasta raiz do projeto (geralmente `"."`)
- `--artifacts-dir`: Onde o arquivo `.zip` será salvo (recomendamos uma pasta fora da raiz)
- `--ignore-files`: Garante que ficheiros sensíveis como `config.js` não sejam incluídos no pacote final.

---

## 🐛 Reportando Bugs

Encontrou um problema? Adoramos ouvir! Bugs bem reportados ajudam a tornar o projeto melhor para todos.

### Antes de Reportar

- ✅ Verifique se o bug **já foi reportado** em [Issues](https://github.com/rodrigochavesoa/colab-pdf-reader/issues)
- ✅ Tente **reproduzir** o bug em um PDF diferente
- ✅ Teste em **mais de um navegador** (Chrome e Edge)
- ✅ Limpe o **cache** da extensão (pressione `Ctrl+Shift+Delete`)

### Como Reportar um Bug

Abra uma [Issue](https://github.com/rodrigochavesoa/colab-pdf-reader/issues) com as seguintes informações:

#### Template

```markdown
## Título Claro do Bug
Uma linha curta descrevendo o problema.

## Descrição
Descrição detalhada do que você esperava vs. o que aconteceu.

## Passos para Reproduzir
1. Abra o PDF [nome_do_arquivo.pdf]
2. Selecione o texto [descreva qual texto]
3. [Próximo passo...]
4. Observe o comportamento inesperado

## Comportamento Esperado
Descreva claramente o que deveria acontecer.

## Comportamento Atual
Descreva o que realmente acontece.

## Informações do Sistema
- **SO:** Windows 10 / macOS / Linux
- **Navegador:** Chrome v[número] / Edge v[número]
- **Versão da Extensão:** 1.0.0
- **Modo:** Desenvolvedor / Web Store (quando disponível)

## Logs de Console
Abra DevTools (F12), vá para "Console" e cole qualquer erro que apareça:
```
[cole logs aqui]
```

## Screenshots ou GIF
Se aplicável, adicione capturas de tela ou GIFs mostrando o problema.

## Contexto Adicional
Outras informações que possam ser relevantes (ex: tipo de PDF, idioma do texto, etc.)
```

### Exemplos de Bugs Bem Reportados

✅ **Bom:** "Sidebar de tradução não abre ao selecionar texto em PDF com múltiplas colunas"
- Inclui contexto específico
- Descreve comportamento vs. esperado
- Fornece passos para reproduzir

❌ **Ruim:** "Tradução não funciona"
- Vago e sem detalhes
- Sem contexto
- Sem informações do sistema

---

## 💡 Sugerindo Features

Tem uma ideia incrível? Adoramos ouvir sugestões que podem melhorar o projeto!

### Antes de Sugerir

- ✅ Verifique se a feature **já foi sugerida** em [Issues](https://github.com/rodrigochavesoa/colab-pdf-reader/issues) ou [Discussões](https://github.com/rodrigochavesoa/colab-pdf-reader/discussions)
- ✅ Leia o **[Roadmap](./README.md#-roadmap)** para ver o que está planejado
- ✅ Considere se a feature **resolve um problema real** para os usuários

### Como Sugerir uma Feature

Abra uma [Discussion](https://github.com/rodrigochavesoa/colab-pdf-reader/discussions) (ou Issue se for mais urgent) com:

#### Template

```markdown
## Resumo da Feature
Uma linha descrevendo a feature desejada.

## Problema que Resolve
Qual problema real o usuário enfrenta? 
Por que esta feature é importante?

## Descrição Detalhada
Como você imagina que esta feature funcionaria?
Descreva o fluxo de usuário.

## Exemplos de Uso
- Caso de uso 1: [descrição]
- Caso de uso 2: [descrição]

## Impacto Técnico
Quais mudanças no código seriam necessárias?
Há riscos ou dependências?

## Alternativas Consideradas
Há outras formas de resolver este problema?

## Exemplos de Projetos Similares
Links para outras extensões ou aplicações que têm funcionalidades similares.

## Prioridade
- [ ] Nice to have
- [ ] Importante
- [ ] Critical
```

### Critérios de Aceitação

Features devem:
- ✅ Resolver um **problema real** para usuários
- ✅ Estar **alinhadas com a visão** do projeto
- ✅ Ser **tecnicamente viável** no Manifest V3
- ✅ Não **comprometer a privacidade** ou performance
- ✅ Estar **documentadas adequadamente**

---

## 🔄 Processo de Contribuição

### Fluxo de Trabalho

```
1. Fork o repositório
   ↓
2. Crie uma branch para sua feature/fix
   ↓
3. Faça commits atômicos e descritivos
   ↓
4. Escreva/atualize testes
   ↓
5. Atualize a documentação
   ↓
6. Push para seu fork
   ↓
7. Abra um Pull Request
   ↓
8. Responda a review comments
   ↓
9. Merge!
```

### Criando uma Branch

Use nomes descritivos para suas branches:

```bash
# Para features
git checkout -b feature/nomear-sidebar-traducao

# Para bugfixes
git checkout -b fix/corrigir-zoom-text-layer

# Para documentação
git checkout -b docs/melhorar-instrucoes-setup

# Para performance
git checkout -b perf/otimizar-renderizacao-pdf
```

**Convenção:** `tipo/descrição-curta`

Tipos válidos: `feature`, `fix`, `docs`, `perf`, `refactor`, `test`, `chore`

---

## 💻 Padrões de Código

Mantemos um código limpo, legível e consistente. Siga estas diretrizes:

### JavaScript

#### Formatação
- Use **2 espaços** para indentação (não tabs)
- Máximo de **100 caracteres** por linha
- Quebras de linha para readabilidade em objetos/arrays longos

```javascript
// ✅ Bom
const config = {
  provider: 'microsoft',
  region: 'brazilsouth',
  maxChars: 50000
};

// ❌ Evitar
const config = { provider: 'microsoft', region: 'brazilsouth', maxChars: 50000 };
```

#### Nomes e Convenções
- **Variáveis/funções:** `camelCase`
- **Classes/Construtores:** `PascalCase`
- **Constantes:** `UPPER_SNAKE_CASE`
- **Privadas:** prefixo `_` (ex: `_privateMethod()`)

```javascript
// ✅ Bom
class TranslatorService {
  constructor(provider) {
    this.provider = provider;
    this._apiKey = getApiKey();
  }
  
  async translateText(text) {
    // implementação
  }
}

const MAX_CHARS_PER_REQUEST = 50000;
```

#### Comentários
- Comente o **"por quê"**, não o **"o quê"**
- Mantenha comentários **atualizados** com o código
- Use `// TODO:` para tarefas pendentes
- Use `// FIXME:` para problemas conhecidos

```javascript
// ✅ Bom
// Microsoft Azure Translator tem limite de 50k caracteres por requisição
// Para textos maiores, precisamos quebrar em chunks
const chunks = text.match(/.{1,50000}/g) || [text];

// ❌ Ruim
// divide o texto em chunks
const chunks = text.match(/.{1,50000}/g);
```

#### Async/Await
- Sempre use `async`/`await` em vez de `.then()`
- Use `try`/`catch` para tratamento de erros
- Nunca ignore erros de Promise

```javascript
// ✅ Bom
async function translateText(text) {
  try {
    const result = await translator.translate(text);
    return result;
  } catch (error) {
    console.error('Translation failed:', error);
    throw error; // propagar o erro se apropriado
  }
}

// ❌ Evitar
async function translateText(text) {
  const result = await translator.translate(text);
  return result; // sem tratamento de erro
}
```

#### ES6+ Features
- Use `const` por padrão, `let` quando necessário reatribuir, nunca use `var`
- Use destructuring quando apropriado
- Use arrow functions para callbacks
- Use template literals para strings com interpolação

```javascript
// ✅ Bom
const { provider, apiKey } = config;
const translate = async (text) => {
  return `Translated: ${text}`;
};

// ❌ Evitar
var provider = config.provider;
var translate = function(text) {
  return 'Translated: ' + text;
};
```

### HTML/CSS

#### HTML
- Use **semantic HTML** sempre que possível
- Indentação com **2 espaços**
- Use `data-*` attributes para dados do JavaScript

```html
<!-- ✅ Bom -->
<section class="translator-sidebar">
  <header class="sidebar__header">
    <h2>Tradução</h2>
  </header>
  <div class="sidebar__content" data-target="translationOutput">
    <!-- conteúdo -->
  </div>
</section>

<!-- ❌ Evitar -->
<div id="sidebar">
  <div>Tradução</div>
  <div id="content"><!-- conteúdo --></div>
</div>
```

#### CSS
- Siga a **metodologia BEM** para nomes de classes
- Use **variáveis CSS** para cores e valores reutilizáveis
- Mantenha especificidade **baixa**
- Use flexbox/grid para layouts

```css
/* ✅ Bom */
.translator-sidebar {
  background-color: var(--color-background);
  padding: var(--spacing-md);
}

.translator-sidebar__header {
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-sm);
}

.translator-sidebar__content {
  max-height: var(--sidebar-max-height);
  overflow-y: auto;
}

/* ❌ Evitar */
#sidebar { background: white; }
#sidebar .header { font-size: 18px; }
#sidebar .header h2 { margin: 10px; }
```

### Lint e Formatação

Recomendamos usar um **linter** e **formatter**:

```bash
# Opcional: ESLint (se configurado no projeto)
npm run lint

# Opcional: Prettier (se configurado no projeto)
npm run format
```

Se o projeto não tiver configuração, siga as convenções acima.

---

## ✅ Testes e QA

Toda nova feature ou bugfix deve incluir **testes**.

### Testando Manualmente

1. **Instale a extensão** em modo desenvolvedor (ver [How to Get Started](#-como-começar))
2. **Recarregue** a extensão após mudanças (Chrome: clique no ícone de refresh no card da extensão)
3. **Teste com PDFs reais:**
   - PDF simples (1 página)
   - PDF com múltiplas páginas
   - PDF com imagens
   - PDF com colunas de texto
   - PDF com caracteres especiais
4. **Verifique o Console** (F12) para erros

### Casos de Teste Essenciais

Para uma contribuição, teste:

- [ ] **Navegação básica** (próxima/anterior página)
- [ ] **Zoom** (in/out em múltiplos níveis)
- [ ] **Seleção de texto** (copiar, arrastar, duplo clique)
- [ ] **Tradução** (com provedores diferentes se aplicável)
- [ ] **Persistência** (página salva após fechar e reabrir)
- [ ] **Performance** (sem lag em PDFs grandes)
- [ ] **Diferentes navegadores** (Chrome e Edge)
- [ ] **Responsive** (se interface foi alterada)

### Testes Automatizados (Futura Implementação)

Quando o projeto adoptar testes automatizados, seguiremos:
- Jest para testes unitários
- Cypress para testes E2E
- Cobertura mínima de 80%

---

## 📝 Documentação

Toda mudança no código deve ter **documentação correspondente**.

### O que Documentar

- ✅ **Novas features:** Adicione na seção apropriada do README
- ✅ **Mudanças de API:** Atualize exemplos de código
- ✅ **Padrões complexos:** Comente explicações inline
- ✅ **Setup/instalação:** Atualize guias se workflow mudou
- ✅ **Bugfixes significativos:** Mencione no CHANGELOG (se existente)

### Estilo de Documentação

- Escreva em **português ou inglês claro e acessível**
- Use **exemplos práticos**
- Use **headers apropriados** (markdown hierarchy)
- Adicione **screenshots/GIFs** para features visuais
- Mantenha documentação **curta e ao ponto**

---

## 🔀 Processo de Pull Request

### Antes de Abrir um PR

1. **Atualize sua branch** com as mudanças mais recentes do upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Siga as convenções de commit:**
   ```bash
   git commit -m "fix: corrigir zoom não funcionar em PDFs com múltiplas colunas"
   git commit -m "feat: adicionar atalho de teclado Ctrl+Shift+T para tradução"
   git commit -m "docs: melhorar instruções de instalação"
   ```

   **Formato:** `tipo: descrição imperativa curta`

3. **Execute testes locais** (manualmente ou automaticamente)

4. **Verifique o código** quanto a padrões e boas práticas

### Abrindo o Pull Request

#### Template de PR

Use o template abaixo ao abrir um PR:

```markdown
## Descrição
Breve descrição do que este PR faz.

## Tipo de Mudança
- [ ] 🐛 Bugfix (corrige issue sem quebrar mudanças)
- [ ] ✨ Feature (adiciona funcionalidade, sem quebrar mudanças)
- [ ] 💥 Breaking Change (quebra compatibilidade)
- [ ] 📝 Documentação
- [ ] ♻️ Refactoring
- [ ] 🚀 Performance

## Issue Relacionada
Fecha #[número da issue], se aplicável
Relacionado a #[número], se aplicável

## Como Testar
Descreva os passos para testar sua mudança:
1. Abra um PDF...
2. Selecione texto...
3. Observe...

## Checklist
- [ ] Meu código segue o style guide do projeto
- [ ] Executei linting localmente
- [ ] Testei manualmente com diferentes PDFs
- [ ] Testei em Chrome e Edge
- [ ] Atualizei a documentação relevante
- [ ] Verifiquei se há quebras de compatibilidade
- [ ] Comentei partes complexas do código

## Screenshots (se aplicável)
[Adicione screenshots ou GIFs]

## Notas Adicionais
[Qualquer informação extra relevante]
```

### O Que Esperamos no PR

- ✅ **Commits limpos e atômicos** (um commit por feature/fix)
- ✅ **Descrição clara** do que foi mudado e por quê
- ✅ **Código testado** manualmente
- ✅ **Documentação atualizada**
- ✅ **Sem merges desnecessários** (rebase em vez de merge)

### Processo de Review

1. **Revisores** analisarão seu código
2. Você pode receber **requests para mudanças**
3. **Responda aos comentários** e faça as alterações solicitadas
4. Faça commit das alterações na **mesma branch**
5. O reviewer re-avaliará

### Obtendo Aprovação

Um PR será **merged** quando:
- ✅ Receber **aprovação de pelo menos 1 reviewer**
- ✅ **Testes passarem** (quando automatizados)
- ✅ **Nenhuma mudança conflitante** com `main`
- ✅ **Documentação estiver atualizada**

---

## 📄 Licensing

Ao contribuir para este projeto, você concorda que suas contribuições serão licenciadas sob a mesma **MIT License** do projeto.

Se você está adicionando código de terceiros (bibliotecas, snippets, etc.):
- ✅ Certifique-se de que é **compatível com MIT**
- ✅ **Credite o autor original** em comentários ou ATTRIBUTIONS
- ✅ Inclua **cópia da licença** se necessário

---

## 🆘 Dúvidas ou Precisa de Ajuda?

- 📧 **Contato:** [Colab Developer](https://rodrigochavesoa.github.io/Colab_Developer/#contact)
- 💬 **GitHub Discussions:** [Abra uma discussão](https://github.com/rodrigochavesoa/colab-pdf-reader/discussions)
- 🐛 **GitHub Issues:** [Reporte um bug](https://github.com/rodrigochavesoa/colab-pdf-reader/issues)
- 📱 **Instagram:** [@pontochavedesign](https://instagram.com/pontochavedesign)

---

## 🎯 Próximos Passos

1. ✅ Leia este guia completamente
2. ✅ Verifique o [README.md](./README.md) para entender o projeto
3. ✅ Configure seu ambiente local
4. ✅ Procure por issues com label `good first issue` para começar
5. ✅ Abra um PR com sua contribuição!

---

## 🙏 Obrigado por Contribuir!

Cada contribuição, por menor que seja, faz diferença. Estamos ansiosos para trabalhar com você e tornar o **Colab PDF Reader** ainda melhor!

**Desenvolvido com carinho para leitores, pesquisadores e desenvolvedores que entendem o valor da produtividade.**

---

*Atualizado em June 2025*
*Versão: 1.0.0*
