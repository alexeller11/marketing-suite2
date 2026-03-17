# 🚀 Marketing Suite - Gerenciador de Campanhas com IA

Uma plataforma completa para gerenciar campanhas de marketing em Meta Ads, Google Ads e Instagram com análise inteligente usando Groq.

## ✨ Características

### 📊 Dashboard Inteligente
- Visualização em tempo real de métricas de campanhas
- Gráficos interativos com Recharts
- KPIs principais: orçamento gasto, impressões, cliques, conversões
- Distribuição de orçamento por plataforma

### 🤖 Planejador de IA
- Análise inteligente de campanhas usando Groq
- Recomendações personalizadas de otimização
- Análise de sentimento dos resultados
- Sugestões baseadas em dados históricos

### ⚙️ Gerenciamento de Integrações
- Configuração de credenciais Meta Ads
- Configuração de credenciais Google Ads
- Configuração de credenciais Instagram Ads
- Sincronização automática de dados

### 🎨 Design Cyberpunk
- Interface moderna com tema neon rosa/ciano
- Gradientes e efeitos visuais sofisticados
- Responsivo para desktop e mobile
- Dark mode por padrão

## 🏗️ Arquitetura

```
Marketing Suite
├── Frontend (React 19 + Tailwind CSS 4)
│   ├── Dashboard com gráficos
│   ├── Planejador de IA
│   ├── Configurações de integrações
│   └── Autenticação OAuth
├── Backend (Express + tRPC)
│   ├── Endpoints para campanhas
│   ├── Endpoints para integrações
│   ├── Endpoints para análise de IA
│   └── Autenticação e autorização
└── Banco de Dados (PostgreSQL)
    ├── Usuários
    ├── Campanhas
    ├── Histórico de métricas
    ├── Alertas de orçamento
    └── Credenciais de integração
```

## 🔧 Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, Tailwind CSS 4, Recharts |
| Backend | Express 4, tRPC 11, Node.js |
| Banco de Dados | PostgreSQL, Drizzle ORM |
| Autenticação | Manus OAuth |
| IA | Groq API |
| APIs Externas | Meta Ads, Google Ads |

## 📋 Endpoints tRPC

### Campanhas
```typescript
campaigns.list()           // Listar campanhas do usuário
campaigns.create(data)     // Criar nova campanha
```

### Integrações
```typescript
integrations.getCredentials(platform)      // Obter credenciais
integrations.saveCredentials(data)         // Salvar credenciais
```

### IA
```typescript
ai.analyzeCampaign(data)                   // Analisar campanha
ai.getRecommendations(data)                // Obter recomendações
```

### Orçamento
```typescript
budgetAlerts.list()                        // Listar alertas
```

## 🗄️ Schema do Banco de Dados

### users
- Usuários autenticados via OAuth
- Campos: id, openId, name, email, role, createdAt, updatedAt

### campaigns
- Campanhas de marketing
- Campos: id, userId, name, platform, externalId, budget, spent, impressions, clicks, conversions, createdAt, updatedAt

### budget_alerts
- Alertas de orçamento
- Campos: id, userId, campaignId, threshold, isActive, createdAt

### integration_credentials
- Credenciais de integração
- Campos: userId, platform, accessToken, refreshToken, metadata, createdAt, updatedAt

### campaign_history
- Histórico de métricas
- Campos: id, campaignId, date, spent, impressions, clicks, conversions, createdAt

## 🚀 Deployment

### Render (Recomendado)
1. Conecte seu repositório GitHub
2. Configure variáveis de ambiente
3. Deploy automático a cada push

### Variáveis de Ambiente Necessárias

**APIs Externas:**
```
META_APP_ID=6c5421fc9134212b96096e5a4b6f5eb8
META_APP_SECRET=534af70c174b3c8f1c867f741098533a
GOOGLE_CLIENT_ID=141533490282-5vvg10c044qqtpbclh1l7ej7u02f4urm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_API_KEY=-ENtyxwHVbD-iWslE05clQ
GROQ_API_KEY=<sua_chave_groq>
DATABASE_URL=<postgresql_url>
```

**Sistema (Gerenciadas pelo Manus):**
```
JWT_SECRET
VITE_APP_ID
OAUTH_SERVER_URL
VITE_OAUTH_PORTAL_URL
OWNER_OPEN_ID
OWNER_NAME
```

## 💻 Desenvolvimento Local

```bash
# Instalar dependências
pnpm install

# Executar servidor de desenvolvimento
pnpm dev

# Executar testes
pnpm test

# Build para produção
pnpm build

# Iniciar servidor de produção
pnpm start
```

## 📱 Páginas Principais

### Dashboard (`/`)
- Visão geral de todas as campanhas
- Métricas agregadas
- Gráficos de desempenho
- Distribuição por plataforma

### Planejador de IA (`/ai-planner`)
- Análise inteligente de campanhas
- Recomendações de otimização
- Análise de sentimento
- Histórico de análises

### Configurações (`/settings`)
- Gerenciar credenciais Meta Ads
- Gerenciar credenciais Google Ads
- Gerenciar credenciais Instagram Ads
- Instruções de setup

## 🔐 Autenticação

1. Usuário clica em "Fazer Login"
2. Redirecionado para Manus OAuth
3. Após autenticação, retorna com session cookie
4. Acesso aos endpoints protegidos com `protectedProcedure`

## 🧪 Testes

```bash
# Executar todos os testes
pnpm test

# Executar testes em modo watch
pnpm test --watch

# Executar testes específicos
pnpm test server/integrations.test.ts
```

## 📊 Métricas Rastreadas

- **Orçamento Gasto (R$)**: Total investido em campanhas
- **Impressões**: Número de vezes que o anúncio foi exibido
- **Cliques**: Número de cliques no anúncio
- **Conversões**: Número de ações completadas
- **CTR (%)**: Taxa de clique (Cliques / Impressões)
- **CPC (R$)**: Custo por clique (Orçamento / Cliques)
- **ROI (%)**: Retorno sobre investimento

## 🎯 Fluxo de Uso

1. **Autenticação**: Fazer login com Manus OAuth
2. **Configurar Integrações**: Adicionar credenciais das APIs
3. **Visualizar Dashboard**: Ver métricas das campanhas
4. **Analisar com IA**: Usar Planejador de IA para insights
5. **Otimizar**: Implementar recomendações

## 🐛 Troubleshooting

| Erro | Causa | Solução |
|------|-------|---------|
| "Failed to construct 'URL': Invalid URL" | DATABASE_URL inválida | Verifique DATABASE_URL no Render |
| "Cannot find package 'postgres'" | Dependências não instaladas | Execute `pnpm install` |
| "Unauthorized" em endpoints | Usuário não autenticado | Faça login primeiro |
| Gráficos não aparecem | Dados não carregados | Verifique conexão com banco |

## 📈 Próximos Passos

1. ✅ Dashboard com gráficos
2. ✅ Planejador de IA
3. ✅ Configurações de integrações
4. ⏳ Sincronização automática de dados
5. ⏳ Sistema de alertas por email
6. ⏳ Suporte para TikTok Ads
7. ⏳ Suporte para LinkedIn Ads
8. ⏳ Exportação de relatórios em PDF

## 📚 Documentação

- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./server/routers.ts)
- [Database Schema](./drizzle/schema.ts)

## 🤝 Contribuindo

Para reportar bugs ou sugerir features:
1. Crie uma issue no GitHub
2. Descreva o problema/feature
3. Forneça exemplos se possível

## 📄 Licença

MIT

## 📞 Suporte

Para dúvidas ou problemas:
- Documentação Manus: https://docs.manus.im
- Meta Developers: https://developers.facebook.com
- Google Developers: https://developers.google.com
- Groq Console: https://console.groq.com

---

**Marketing Suite v1.0** - Gerenciador de Campanhas com IA 🚀
