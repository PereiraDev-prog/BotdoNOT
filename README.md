# 🚀 Bot de Discord Enterprise - Loja Completa

Bot de Discord profissional com sistema completo de loja virtual, pagamentos, tickets, moderação, rastreamento de convites e muito mais!

## ✨ Funcionalidades Enterprise

### 🛒 Sistema de Loja
- Catálogo de produtos interativo
- Carrinho de compras
- Sistema de pedidos
- Gerenciamento de estoque
- Notificações automáticas

### 💳 Sistema de Pagamento
- **PIX** - QR Code automático
- **Cartão de Crédito** - Integração Stripe/Mercado Pago
- **Criptomoedas** - Pagamentos em Bitcoin
- Verificação automática de pagamentos
- Histórico de transações

### 🎫 Sistema de Tickets
- Criação automática de canais
- Categorias personalizadas (Suporte, Vendas, Denúncia)
- Transcripts automáticos
- Sistema de fechamento com histórico

### 📊 Rastreador de Convites
- Tracking completo de convites
- Leaderboard de convidadores
- Detecção de convites fake
- Estatísticas detalhadas
- Recompensas automáticas

### 🛡️ Sistema de Moderação
- Avisos (warns)
- Mutes temporários e permanentes
- Kicks e Bans
- Histórico de moderação
- Logs automáticos

### 🎉 Sistema de Sorteios
- Sorteios com duração customizada
- Múltiplos vencedores
- Sistema de reroll
- Participação via botão
- Requisitos personalizáveis

### 👋 Boas-vindas e Despedidas
- Mensagens personalizáveis
- Embeds customizados
- Variáveis dinâmicas ({user}, {server}, {count})
- Cargo automático para novos membros

### 📝 Sistema de Logs
- Logs de entrada/saída de membros
- Logs de mensagens (em breve)
- Logs de moderação
- Logs de ações administrativas

## 📋 Comandos

### Para Clientes
```
/produtos              - Ver catálogo de produtos
/adicionar             - Adicionar produto ao carrinho
/carrinho              - Ver carrinho e finalizar compra
/pedidos               - Ver histórico de pedidos
/pagar                 - Escolher método de pagamento
/convites meus         - Ver seus convites
/convites top          - Ranking de convites
/ticket criar          - Criar ticket de suporte
```

### Para Moderadores
```
/mod warn              - Avisar usuário
/mod mute              - Silenciar usuário
/mod unmute            - Remover silenciamento
/mod kick              - Expulsar usuário
/mod ban               - Banir usuário
/mod historico         - Ver histórico de moderação
```

### Para Administradores
```
/admin-produto         - Gerenciar produtos
/admin-pedidos         - Gerenciar pedidos
/admin-pagamentos      - Ver pagamentos
/sorteio criar         - Criar sorteio
/sorteio encerrar      - Encerrar sorteio
/sorteio reroll        - Sortear novos vencedores
/config                - Configurar bot
```

### Configuração
```
/config boas-vindas ativar     - Ativar boas-vindas
/config despedida ativar       - Ativar despedidas
/config auto-cargo ativar      - Ativar cargo automático
/config logs membros           - Configurar logs de membros
```

## 🚀 Instalação

### 1. Pré-requisitos
- Node.js 18 ou superior
- Conta Discord Developer

### 2. Criar Aplicação Discord

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em "New Application"
3. Vá em "Bot" e clique em "Reset Token"
4. Ative as **Privileged Gateway Intents**:
   - Server Members Intent ✅
   - Message Content Intent ✅
5. Em "OAuth2" > "URL Generator":
   - Scopes: `bot`, `applications.commands`
   - Permissions: `Administrator`
6. Use a URL gerada para adicionar o bot

### 3. Instalar Dependências

```bash
npm install
```

### 4. Configurar Variáveis de Ambiente

```bash
copy .env.example .env
```

Edite o `.env`:

```env
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=seu_client_id
GUILD_ID=seu_server_id
ORDERS_CHANNEL_ID=id_canal_pedidos
ADMIN_ROLE_ID=id_cargo_admin
TICKET_CATEGORY_ID=id_categoria_tickets
```

**Como obter IDs:**
1. Ative o Modo Desenvolvedor no Discord (Configurações > Avançado)
2. Clique com botão direito > Copiar ID

### 5. Registrar Comandos

```bash
npm run deploy
```

### 6. Iniciar Bot

```bash
npm start
```

Para desenvolvimento:
```bash
npm run dev
```

## ⚙️ Configuração Inicial

### 1. Configurar Boas-vindas
```
/config boas-vindas ativar canal:#boas-vindas mensagem:"Bem-vindo {user}!" embed:true
```

### 2. Configurar Auto-cargo
```
/config auto-cargo ativar cargo:@Membro
```

### 3. Configurar Logs
```
/config logs membros entradas:#logs-entradas saidas:#logs-saidas
```

### 4. Adicionar Produtos
```
/admin-produto adicionar nome:"Produto VIP" descricao:"Acesso VIP" preco:50 estoque:100
```

### 5. Criar Categoria de Tickets
1. Crie uma categoria "🎫 TICKETS"
2. Copie o ID
3. Adicione em `TICKET_CATEGORY_ID` no `.env`

## 💳 Integração de Pagamentos

### PIX (Mercado Pago)
Edite `src/services/payment.js`:
```javascript
const generatePixCode = async (amount) => {
  // Integrar com API do Mercado Pago
  const response = await mercadopago.payment.create({...});
  return response.qr_code;
};
```

### Cartão (Stripe)
```javascript
const generateCardCheckoutUrl = async (orderId, amount) => {
  const session = await stripe.checkout.sessions.create({...});
  return session.url;
};
```

## 📁 Estrutura do Projeto

```
xit/
├── src/
│   ├── commands/           # Comandos slash
│   │   ├── produtos.js
│   │   ├── adicionar.js
│   │   ├── carrinho.js
│   │   ├── pedidos.js
│   │   ├── pagar.js
│   │   ├── ticket.js
│   │   ├── convites.js
│   │   ├── mod.js
│   │   ├── sorteio.js
│   │   ├── config.js
│   │   ├── admin-produto.js
│   │   └── admin-pedidos.js
│   ├── events/             # Eventos
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   ├── guildMemberAdd.js
│   │   └── guildMemberRemove.js
│   ├── services/           # Serviços
│   │   ├── payment.js
│   │   ├── ticket.js
│   │   ├── invites.js
│   │   ├── moderation.js
│   │   └── giveaway.js
│   ├── config.js
│   ├── database.js
│   ├── index.js
│   └── deploy-commands.js
├── data/                   # Dados (JSON)
└── README.md
```

## 🎨 Personalização

### Cores dos Embeds
Edite `src/config.js`:
```javascript
colors: {
  primary: 0x5865F2,
  success: 0x57F287,
  warning: 0xFEE75C,
  error: 0xED4245,
}
```

### Emojis
```javascript
emojis: {
  cart: '🛒',
  product: '📦',
  money: '💰',
  // ...
}
```

## 🔧 Troubleshooting

### Bot não responde
- Verifique se o token está correto
- Confirme que os Intents estão ativados
- Rode `npm run deploy` novamente

### Comandos não aparecem
- Execute `npm run deploy`
- Aguarde até 1 hora para sincronização
- Verifique se o `GUILD_ID` está correto

### Tickets não criam canais
- Verifique permissões do bot
- Confirme que `TICKET_CATEGORY_ID` está configurado
- Bot precisa de permissão "Manage Channels"

### Convites não são rastreados
- Bot precisa de permissão "Manage Server"
- Aguarde o bot cachear os convites (acontece no ready)

## 📊 Database

O bot usa JSON para armazenamento. Para produção, considere migrar para:
- MongoDB
- PostgreSQL
- MySQL

## 🔐 Segurança

- **Nunca** compartilhe seu `.env`
- Use variáveis de ambiente para dados sensíveis
- Para produção, implemente criptografia
- Configure backups automáticos

## 📝 Licença

MIT

## 🤝 Suporte

Para dúvidas:
1. Verifique os logs do console
2. Confirme configurações no `.env`
3. Teste permissões do bot

---

**Desenvolvido com ❤️ para lojas no Discord**

🚀 **Enterprise Edition** - Sistema completo de gerenciamento
