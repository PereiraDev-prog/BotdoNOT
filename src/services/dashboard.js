import express from 'express';
import { EmbedBuilder } from 'discord.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../database.js';
import { config } from '../config.js';
import { handlePaymentWebhook } from './payment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3000;
const PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin123';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dashboard')));

let discordClient; // Declared discordClient

// Webhook Mercado Pago
app.post('/webhooks/mercadopago', async (req, res) => {
    const { action, data } = req.body;

    if (action === 'payment.created' || action === 'payment.updated' || req.query.type === 'payment') {
        const paymentId = data?.id || req.query['data.id'];
        if (paymentId) {
            console.log(`🔔 Notificação de pagamento recebida: ${paymentId}`);
            const payment = await handlePaymentWebhook(paymentId);

            if (payment && payment.status === 'completed' && discordClient) {
                try {
                    const user = await discordClient.users.fetch(payment.userId);
                    const order = db.getOrder(payment.orderId);

                    const embed = new EmbedBuilder()
                        .setTitle('✨ Pagamento Confirmado!')
                        .setDescription(`Olá! Seu pagamento para o pedido **#${payment.orderId}** foi aprovado com sucesso.`)
                        .addFields(
                            { name: '💰 Valor Pago', value: `\`R$ ${payment.amount.toFixed(2)}\``, inline: true },
                            { name: '💳 Método', value: payment.method === 'pix' ? 'Pix' : 'Cartão', inline: true },
                            { name: '📦 Itens do Pedido', value: order.items.map(i => `> • **${i.name}** (x${i.quantity})`).join('\n') }
                        )
                        .setColor(config.colors.success)
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/438/438526.png') // Success icon
                        .setFooter({ text: 'Sua entrega está sendo processada...' })
                        .setTimestamp();

                    await user.send({ embeds: [embed] });

                    // Entrega automática de conteúdo e cargos
                    try {
                        const guild = await discordClient.guilds.fetch(config.guildId);
                        const member = await guild.members.fetch(payment.userId).catch(() => null);

                        for (const item of order.items) {
                            // Entregar conteúdo (Link, Key, etc) via DM
                            if (item.content) {
                                try {
                                    await user.send({
                                        content: `📦 **Seu produto: ${item.name}**\nConteúdo: ${item.content}`
                                    });
                                } catch (e) {
                                    console.error(`Erro ao entregar conteúdo para ${user.tag}:`, e);
                                }
                            }

                            // Entregar Cargo
                            if (item.roleId && member) {
                                try {
                                    const role = await guild.roles.fetch(item.roleId);
                                    if (role) {
                                        await member.roles.add(role);
                                        console.log(`✅ Cargo ${role.name} adicionado para ${member.user.tag}`);
                                    }
                                } catch (e) {
                                    console.error(`Erro ao adicionar cargo ${item.roleId} para ${member.user.tag}:`, e);
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Erro ao buscar guilda ou membro para entrega:', e);
                    }

                    console.log(`📦 Pedido #${payment.orderId} processado e entregue para ${user.tag}`);

                    // Notificação de Venda (Log de Vendas)
                    try {
                        const salesChannelId = db.config.logs?.salesLogChannelId;
                        if (salesChannelId) {
                            const salesChannel = await discordClient.channels.fetch(salesChannelId).catch(() => null);
                            if (salesChannel) {
                                const salesEmbed = new EmbedBuilder()
                                    .setAuthor({
                                        name: `${user.username}`,
                                        iconURL: user.displayAvatarURL({ dynamic: true })
                                    })
                                    .setTitle('✅ Compra Realizada')
                                    .setDescription('**Carrinho**')
                                    .addFields(
                                        {
                                            name: '\u200B',
                                            value: order.items.map(item => `📦 **${item.quantity}x ${item.name.toUpperCase()}** - \`R$ ${item.price.toFixed(2)}\``).join('\n')
                                        },
                                        {
                                            name: 'Valor pago',
                                            value: `**R$ ${payment.amount.toFixed(2)}**`,
                                            inline: false
                                        }
                                    )
                                    .setColor('#2ecc71') // Green like in the image
                                    .setFooter({
                                        text: `${interaction.guild?.name || 'Kronik Store'}`, // Fallback for guild name
                                        iconURL: interaction.guild?.iconURL()
                                    })
                                    .setTimestamp();

                                // Since we are in an async webhook, interaction might not be defined. 
                                // Let's use discordClient to find the guild first for better footer.
                                const guild = await discordClient.guilds.fetch(config.guildId).catch(() => null);
                                if (guild) {
                                    salesEmbed.setFooter({ text: `${guild.name}`, iconURL: guild.iconURL() });
                                }

                                await salesChannel.send({ embeds: [salesEmbed] });
                            }
                        }
                    } catch (salesLogError) {
                        console.error('Erro ao enviar log de venda:', salesLogError);
                    }
                } catch (error) {
                    console.error('Erro ao processar entrega do pagamento:', error);
                }
            }
        }
    }

    res.status(200).send('OK');
});

// Middleware de Autenticação
const auth = (req, res, next) => {
    const password = req.headers['authorization'];
    if (password === PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Não autorizado' });
    }
};

// Rotas da API
app.get('/api/stats', auth, (req, res) => {
    res.json({
        members: db.config.memberCount || 0, // Precisamos implementar esse tracker
        orders: db.orders.length,
        totalSales: db.orders.reduce((acc, curr) => acc + curr.total, 0),
        activeTickets: db.tickets.filter(t => t.status === 'open').length,
        productsCount: db.products.length
    });
});

app.get('/api/products', auth, (req, res) => {
    res.json(db.products);
});

app.post('/api/products', auth, (req, res) => {
    const product = db.addProduct(req.body);
    res.json(product);
});

app.put('/api/products/:id', auth, (req, res) => {
    const id = parseInt(req.params.id);
    const index = db.products.findIndex(p => p.id === id);
    if (index !== -1) {
        db.products[index] = { ...db.products[index], ...req.body };
        db.save();
        res.json(db.products[index]);
    } else {
        res.status(404).json({ error: 'Produto não encontrado' });
    }
});

app.delete('/api/products/:id', auth, (req, res) => {
    const id = parseInt(req.params.id);
    db.removeProduct(id);
    res.json({ success: true });
});

app.get('/api/orders', auth, (req, res) => {
    res.json(db.orders);
});

app.put('/api/orders/:id/status', auth, (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const order = db.updateOrderStatus(id, status);
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ error: 'Pedido não encontrado' });
    }
});

app.get('/api/config', auth, (req, res) => {
    res.json(db.config);
});

app.post('/api/config', auth, async (req, res) => {
    try {
        db.config = { ...db.config, ...req.body };
        await db.save();
        console.log('✅ Configurações salvas via Dashboard');
        res.json(db.config);
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        res.status(500).json({ error: 'Erro ao salvar' });
    }
});

app.post('/api/post-rules', auth, async (req, res) => {
    try {
        const { channelId, text } = req.body;
        const channel = await discordClient.channels.fetch(channelId);
        if (!channel) return res.status(404).json({ error: 'Canal não encontrado' });

        const embed = new EmbedBuilder()
            .setTitle('⚖️ Regras da Not Store')
            .setDescription(text)
            .setColor(config.colors.white)
            .setFooter({ text: 'Not Store - Todos os direitos reservados' })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Erro ao postar regras:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Senha incorreta' });
    }
});

export const startDashboard = (client) => {
    discordClient = client;
    // Atualizar contagem de membros nas estatísticas
    app.get('/api/stats', auth, (req, res) => {
        const guild = client.guilds.cache.get(config.guildId);
        res.json({
            members: guild ? guild.memberCount : 0,
            orders: db.orders.length,
            totalSales: db.orders.reduce((acc, curr) => acc + (curr.status === 'completed' || curr.status === 'processing' ? curr.total : 0), 0),
            activeTickets: db.tickets.filter(t => t.status === 'open').length,
            productsCount: db.products.length,
            recentOrders: db.orders.slice(-5).reverse()
        });
    });

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Dashboard rodando na porta ${PORT} (0.0.0.0)`);
    });
};
