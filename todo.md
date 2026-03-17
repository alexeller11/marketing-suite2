# Marketing Suite - TODO

## Deploy no Render
- [x] Exportar código para GitHub
- [x] Conectar repositório ao Render
- [x] Configurar variáveis de ambiente
- [x] Executar primeiro deploy
- [x] Validar aplicação em produção

## Banco de Dados
- [x] Configurar PostgreSQL no Neon ou Supabase
- [x] Obter DATABASE_URL e adicionar como variável de ambiente
- [x] Criar schema completo com tabelas para campanhas, usuários, histórico
- [ ] Executar migrações (pnpm db:push)
- [ ] Validar conexão com banco de dados

## Integrações de APIs
- [x] Validar integração Meta Ads API (App ID: 6c5421fc9134212b96096e5a4b6f5eb8, Secret: 534af70c174b3c8f1c867f741098533a)
- [x] Validar integração Google Ads API (Client Secret: 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, API Key: -ENtyxwHVbD-iWslE05clQ)
- [x] Validar integração Groq para análise de IA
- [x] Implementar endpoints tRPC para sincronizar dados das APIs
- [ ] Testar fluxo de autenticação OAuth para Meta e Google

## Interface e Funcionalidades
- [x] Implementar Dashboard com gráficos de campanhas
- [ ] Implementar página Meta Ads com gerenciamento de campanhas
- [ ] Implementar página Instagram Ads
- [ ] Implementar página Google Ads
- [x] Implementar Planejador de IA com Groq
- [ ] Implementar página de Histórico com exportação de dados
- [ ] Implementar sistema de Alertas de Orçamento
- [x] Implementar página de Configurações com gerenciamento de credenciais
- [x] Implementar design cyberpunk com tema neon rosa/ciano

## Testes e Validação
- [x] Testar autenticação OAuth no app
- [x] Testar sincronização de dados das APIs
- [x] Corrigir erro de script na página inicial
- [ ] Testar Planejador de IA com dados reais
- [ ] Validar gráficos e visualizações no Dashboard
- [ ] Testar alertas de orçamento

## Deploy
- [ ] Configurar variáveis de ambiente no Render (DATABASE_URL, API Keys, Secrets)
- [ ] Fazer push do código para GitHub
- [ ] Verificar deploy automático no Render
- [ ] Validar app em produção
- [ ] Testar fluxo completo com dados reais

## Documentação
- [ ] Atualizar README com instruções de setup
- [ ] Documentar variáveis de ambiente necessárias
- [ ] Criar guia de troubleshooting
