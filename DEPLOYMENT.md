# Marketing Suite - Guia de Deploy

## Visão Geral

O Marketing Suite é uma plataforma completa de gerenciamento de campanhas de marketing com integrações com Meta Ads, Google Ads e análise de IA usando Groq.

## Arquitetura

- **Frontend**: React 19 + Tailwind CSS 4 + Recharts (gráficos)
- **Backend**: Express 4 + tRPC 11 + PostgreSQL
- **Autenticação**: Manus OAuth
- **IA**: Groq (análise de campanhas)
- **Banco de Dados**: PostgreSQL com Drizzle ORM

## Funcionalidades Implementadas

### Dashboard
- Visualização de métricas em tempo real (orçamento gasto, impressões, cliques, conversões)
- Gráficos de desempenho com Recharts
- Distribuição de orçamento por plataforma

### Planejador de IA
- Análise inteligente de campanhas usando Groq
- Recomendações de otimização
- Análise de sentimento dos resultados

### Configurações
- Gerenciamento de credenciais Meta Ads
- Gerenciamento de credenciais Google Ads
- Gerenciamento de credenciais Instagram Ads

### Integrações
- **Meta Ads API**: Sincronização de campanhas, insights e métricas
- **Google Ads API**: Acesso a campanhas e dados de desempenho
- **Groq API**: Análise inteligente de campanhas

## Variáveis de Ambiente Necessárias

### APIs Externas
```
META_APP_ID=6c5421fc9134212b96096e5a4b6f5eb8
META_APP_SECRET=534af70c174b3c8f1c867f741098533a
GOOGLE_CLIENT_ID=141533490282-5vvg10c044qqtpbclh1l7ej7u02f4urm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_API_KEY=-ENtyxwHVbD-iWslE05clQ
GROQ_API_KEY=<sua_chave_groq>
```

### Sistema (Gerenciadas pelo Manus)
```
DATABASE_URL=<postgresql_connection_string>
JWT_SECRET=<jwt_secret>
VITE_APP_ID=<manus_app_id>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=<manus_oauth_portal>
OWNER_OPEN_ID=<owner_id>
OWNER_NAME=<owner_name>
```

## Deploy no Render

### Pré-requisitos
1. Conta no Render (https://render.com)
2. Repositório GitHub com o código
3. Variáveis de ambiente configuradas

### Passos para Deploy

1. **Conectar repositório GitHub**
   - Acesse https://dashboard.render.com
   - Clique em "New +" → "Web Service"
   - Selecione seu repositório GitHub

2. **Configurar Build**
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`
   - Environment: Node

3. **Configurar Variáveis de Ambiente**
   - Adicione todas as variáveis listadas acima
   - Certifique-se de que DATABASE_URL está configurada

4. **Deploy**
   - Clique em "Create Web Service"
   - Aguarde o build completar
   - Acesse a URL fornecida pelo Render

## Estrutura do Banco de Dados

### Tabelas Principais

#### `users`
- Usuários autenticados via OAuth
- Campos: id, openId, name, email, role, createdAt, updatedAt

#### `campaigns`
- Campanhas de marketing
- Campos: id, userId, name, platform, externalId, budget, spent, impressions, clicks, conversions, createdAt, updatedAt

#### `budget_alerts`
- Alertas de orçamento
- Campos: id, userId, campaignId, threshold, isActive, createdAt

#### `integration_credentials`
- Credenciais de integração com APIs
- Campos: userId, platform, accessToken, refreshToken, metadata, createdAt, updatedAt

#### `campaign_history`
- Histórico de métricas das campanhas
- Campos: id, campaignId, date, spent, impressions, clicks, conversions, createdAt

## Endpoints tRPC Disponíveis

### Campanhas
- `campaigns.list` - Listar campanhas do usuário
- `campaigns.create` - Criar nova campanha

### Integrações
- `integrations.getCredentials` - Obter credenciais de uma plataforma
- `integrations.saveCredentials` - Salvar credenciais de uma plataforma

### IA
- `ai.analyzeCampaign` - Analisar campanha com Groq
- `ai.getRecommendations` - Obter recomendações de otimização

### Orçamento
- `budgetAlerts.list` - Listar alertas de orçamento

## Fluxo de Autenticação

1. Usuário clica em "Fazer Login"
2. Redirecionado para Manus OAuth
3. Após autenticação, retorna com session cookie
4. Acesso aos endpoints protegidos com `protectedProcedure`

## Troubleshooting

### Erro: "Failed to construct 'URL': Invalid URL"
- **Causa**: DATABASE_URL não configurada ou inválida
- **Solução**: Verifique se DATABASE_URL está corretamente configurada no Render

### Erro: "Cannot find package 'postgres'"
- **Causa**: Dependências não instaladas
- **Solução**: Execute `pnpm install` localmente e `pnpm build`

### Erro: "Unauthorized" em endpoints protegidos
- **Causa**: Usuário não autenticado
- **Solução**: Faça login primeiro através do OAuth

## Desenvolvimento Local

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

## Próximos Passos

1. Implementar sincronização automática de dados das APIs
2. Adicionar mais gráficos e análises
3. Implementar sistema de alertas por email
4. Adicionar suporte para mais plataformas (TikTok Ads, LinkedIn Ads)
5. Implementar exportação de relatórios em PDF

## Suporte

Para dúvidas ou problemas, consulte:
- Documentação do Manus: https://docs.manus.im
- API Meta: https://developers.facebook.com/docs
- API Google: https://developers.google.com/google-ads/api
- Groq: https://console.groq.com/docs
