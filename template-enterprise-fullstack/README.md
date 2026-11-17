# Enterprise Fullstack Starter (React 19 + Node.js VPS + Neon PostgreSQL + Gemini AI)

Estrutura base corporativa projetada para separação limpa de ambientes entre **Front-end Estático (Vercel Edge)** e **Back-end de Processamento (VPS com PM2 / Docker)**.

---

## 🏗️ 1. Arquitetura e Separação de Ambientes

```
┌──────────────────────────────────────────────┐
│  FRONT-END (Vercel / Cloudflare Pages)       │
│  - React 19 + TypeScript + Tailwind CSS      │
│  - SPA servida via CDN / Edge                │
│  - Consome: import.meta.env.VITE_API_URL     │
└───────────────────────┬──────────────────────┘
                        │
                        ▼ (HTTPS REST / JSON)
┌──────────────────────────────────────────────┐
│  BACK-END (VPS Ubuntu / PM2 / Nginx)         │
│  - Node.js (TypeScript via tsx)              │
│  - Express com Socket Timeout de 90s         │
│  - CORS Universal com Preflight 204          │
│  - Body Parser Limit: 50MB                   │
└───────────────┬──────────────────────┬───────┘
                │                      │
                ▼                      ▼
┌─────────────────────────┐  ┌────────────────────────┐
│  PostgreSQL (Neon Cloud)│  │ Google Gemini API      │
│  - SSL (require)        │  │ - v1beta JSON Schema   │
│  - JSONB Metadata       │  │ - gemini-2.5-flash     │
│  - UPSERT Atômico       │  │ - gemini-2.0-flash     │
└─────────────────────────┘  └────────────────────────┘
```

---

## 🚀 2. Guia de Instalação e Desenvolvimento

### 2.1 Instalação das Dependências
```bash
npm install
```

### 2.2 Configuração das Variáveis de Ambiente
Copie o arquivo de exemplo e preencha suas credenciais:
```bash
cp .env.example .env
```

* `DATABASE_URL`: Connection string do PostgreSQL (compatível com Neon).
* `GEMINI_API_KEY`: Chave do Google AI Studio.
* `VITE_API_URL`: URL base do backend em produção (ex: `https://api.meudominio.com.br`). Deixe vazio durante o desenvolvimento com proxy local.

### 2.3 Rodando em Desenvolvimento
```bash
# Inicia Front-end (Vite) na porta 5173
npm run dev

# Inicia Back-end (Express) na porta 3000 com auto-reload
npm run dev:server
```

---

## 🌐 3. Deploy em Produção

### 3.1 Front-end na Vercel
1. Conecte o repositório na Vercel.
2. Nas configurações de **Environment Variables**, adicione:
   * `VITE_API_URL` = `https://api.meudominio.com.br`
3. O arquivo [vercel.json](file:///c:/Users/andre.rosa/Downloads/engenharia-diagnóstica---perícia-de-patologias-prediais/template-enterprise-fullstack/vercel.json) já contém os rewrites necessários para roteamento de SPA sem erros 404.

### 3.2 Back-end na VPS com PM2
Na sua VPS Linux (Ubuntu/Debian):
```bash
# Instala o PM2 globalmente
npm install -g pm2

# Inicia o serviço em segundo plano
pm2 start ecosystem.config.cjs

# Salva a lista de processos para auto-start no reboot da VPS
pm2 save
pm2 startup
```

---

## 🔒 4. Padrões de Resiliência Implementados

1. **CORS Dinâmico:** Aceita requisições vindas de qualquer subdomínio Vercel (`*.vercel.app`) ou domínios configurados, tratando preflight `OPTIONS` com status 204 imediato.
2. **Cold Start do Neon:** O método `initDb()` utiliza `try/catch` para não derrubar a subida do servidor caso o Neon esteja acordando de um estado inativo.
3. **Prevenção de Queda por Sockets Ociosos:** Listener `pool.on('error')` intercepta conexões encerradas pelo proxy do Neon.
4. **UPSERT Nativo:** Gravação com `ON CONFLICT (id) DO UPDATE` elimina race conditions e bloqueios de chave primária.
5. **JSON Mode no Gemini:** Cliente inicializado com `apiVersion: 'v1beta'` para garantir a compatibilidade de schemas tipados sem disparar erro HTTP 400.
