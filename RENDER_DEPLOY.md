# Deploy no Render - Guia Completo

## 📋 Pré-requisitos

- ✅ Conta no Render (https://render.com)
- ✅ Repositório GitHub com o código
- ✅ Banco de dados PostgreSQL (Neon, Supabase, etc.)
- ✅ Credenciais das APIs (Meta, Google, Groq)

## 🚀 Passos para Deploy

### 1. Exportar Código para GitHub

O código está pronto para ser exportado. Use a interface do Manus para exportar para GitHub:

1. Acesse o Dashboard do Manus
2. Clique em "Settings" → "GitHub"
3. Selecione o proprietário e nome do repositório
4. Clique em "Export"

Ou use o CLI do GitHub:
```bash
gh repo create marketing-suite --public --source=. --remote=origin --push
```

### 2. Conectar ao Render

1. Acesse https://dashboard.render.com
2. Clique em "New +" → "Web Service"
3. Selecione "Connect a repository"
4. Escolha o repositório `marketing-suite`
5. Configure:
   - **Name**: `marketing-suite`
   - **Environment**: `Node`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: Free (ou Pro se preferir)

### 3. Configurar Variáveis de Ambiente

No Render, vá para "Environment" e adicione as seguintes variáveis:

#### Banco de Dados
```
DATABASE_URL=postgresql://neondb_owner:npg_t1kyPGN8YiIT@ep-shy-surf-a4s06ml2-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

#### APIs Externas
```
META_APP_ID=6c5421fc9134212b96096e5a4b6f5eb8
META_APP_SECRET=534af70c174b3c8f1c867f741098533a
GOOGLE_CLIENT_ID=141533490282-5vvg10c044qqtpbclh1l7ej7u02f4urm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_API_KEY=-ENtyxwHVbD-iWslE05clQ
GROQ_API_KEY=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
```

#### Sistema (Gerenciadas pelo Manus)
```
NODE_ENV=production
```

### 4. Iniciar Deploy

1. Clique em "Create Web Service"
2. Aguarde o build completar (5-10 minutos)
3. Acesse a URL fornecida pelo Render (ex: `https://marketing-suite.onrender.com`)

## ✅ Verificação Pós-Deploy

Após o deploy, verifique:

1. **Página inicial carrega**: https://seu-app.onrender.com
2. **Botão "Fazer Login" funciona**: Redireciona para OAuth
3. **Dashboard carrega após login**: Mostra gráficos e métricas
4. **Planejador de IA funciona**: Análise com Groq
5. **Configurações carregam**: Gerenciamento de credenciais

## 🔍 Troubleshooting

### Erro: "Failed to construct 'URL': Invalid URL"
- **Causa**: DATABASE_URL não configurada
- **Solução**: Verifique se DATABASE_URL está corretamente configurada no Render

### Erro: "Cannot find module"
- **Causa**: Dependências não instaladas
- **Solução**: Verifique se `pnpm install` está no Build Command

### Erro: "UNAUTHORIZED" em endpoints
- **Causa**: Usuário não autenticado
- **Solução**: Faça login primeiro via OAuth

### Erro: "Groq API error"
- **Causa**: GROQ_API_KEY inválida
- **Solução**: Verifique a chave no console do Groq

## 📊 Monitoramento

No Render, você pode:

1. **Ver logs**: Clique em "Logs" para ver output do servidor
2. **Verificar status**: Dashboard mostra status do serviço
3. **Configurar alertas**: Ative notificações de erro

## 🔄 Deploy Automático

Após conectar ao GitHub:

1. Qualquer push para `main` dispara novo deploy
2. Você pode ver o progresso em "Deploys"
3. Rollback automático se o build falhar

## 📝 Variáveis de Ambiente Adicionais

Se precisar adicionar mais variáveis no futuro:

1. Vá para "Environment" no Render
2. Clique em "Add Environment Variable"
3. Adicione a chave e valor
4. Clique em "Save"
5. O serviço será reiniciado automaticamente

## 🎯 Próximos Passos

1. Configurar domínio customizado (opcional)
2. Habilitar HTTPS (automático no Render)
3. Configurar backups do banco de dados
4. Monitorar performance e logs

## 📞 Suporte

- Documentação Render: https://render.com/docs
- Status do Render: https://status.render.com
- Suporte Neon (DB): https://neon.tech/docs
- Suporte Groq: https://console.groq.com/docs

---

**Marketing Suite v1.1** - Deploy no Render ✅
