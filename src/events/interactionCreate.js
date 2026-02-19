import { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const name = Events.InteractionCreate;

export async function execute(interaction) {
    // Comandos Slash
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Comando ${interaction.commandName} não encontrado.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            const errorMessage = {
                content: `${config.emojis.cross} Ocorreu um erro ao executar este comando!`,
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }

    // Botões
    if (interaction.isButton()) {
        // Giveaway participation
        if (interaction.customId.startsWith('giveaway_join_')) {
            const giveawayId = parseInt(interaction.customId.split('_')[2]);
            const { addParticipant, getGiveaway } = await import('../services/giveaway.js');

            const result = addParticipant(giveawayId, interaction.user.id, interaction.user.username);

            if (!result) {
                return interaction.reply({
                    content: `${config.emojis.cross} Você já está participando deste sorteio!`,
                    ephemeral: true
                });
            }

            // Atualizar embed
            const giveaway = getGiveaway(giveawayId);
            const embed = interaction.message.embeds[0];
            const newEmbed = new EmbedBuilder(embed.data)
                .setFooter({ text: `ID: ${giveaway.id} | Participantes: ${giveaway.participants.length}` });

            await interaction.message.edit({ embeds: [newEmbed] });

            return interaction.reply({
                content: `${config.emojis.check} Você entrou no sorteio!`,
                ephemeral: true
            });
        }

        // Close ticket
        if (interaction.customId.startsWith('close_ticket_')) {
            const ticketId = parseInt(interaction.customId.split('_')[2]);
            const { closeTicket, generateTranscript } = await import('../services/ticket.js');

            const ticket = await closeTicket(ticketId, interaction.user.username);

            if (!ticket) {
                return interaction.reply({
                    content: `${config.emojis.cross} Ticket não encontrado!`,
                    ephemeral: true
                });
            }

            const transcript = generateTranscript(ticketId);

            const embed = new EmbedBuilder()
                .setTitle(`🔒 Ticket #${ticketId} Fechado`)
                .setDescription(`Fechado por: ${interaction.user}`)
                .setColor(config.colors.error)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Enviar transcript
            try {
                const user = await interaction.client.users.fetch(ticket.userId);

                const dmEmbed = new EmbedBuilder()
                    .setTitle(`🎫 Ticket Encerrado`)
                    .setDescription(`Olá **${ticket.username}**, seu atendimento foi finalizado.`)
                    .addFields(
                        { name: '🆔 ID do Ticket', value: `#${ticketId}`, inline: true },
                        { name: '📁 Categoria', value: ticket.category, inline: true },
                        { name: '🔒 Fechado por', value: ticket.closedBy || 'Sistema', inline: true }
                    )
                    .setColor(config.colors.info)
                    .setFooter({ text: 'Obrigado por utilizar nossos serviços!' })
                    .setTimestamp();

                await user.send({
                    embeds: [dmEmbed],
                    files: [{
                        attachment: Buffer.from(transcript, 'utf-8'),
                        name: `historico-ticket-${ticketId}.txt`
                    }]
                });
            } catch (error) {
                console.log('Não foi possível enviar transcript via DM (DMs desativadas)');
            }

            // Deletar canal
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (error) {
                    console.error('Erro ao deletar canal:', error);
                }
            }, 10000);

            return;
        }

        if (interaction.customId === 'view_cart') {
            const cart = db.getCart(interaction.user.id);

            if (cart.length === 0) {
                return interaction.reply({
                    content: `${config.emojis.cart} Seu carrinho está vazio!`,
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`${config.emojis.cart} Seu Carrinho`)
                .setColor(config.colors.primary);

            let total = 0;
            cart.forEach(item => {
                const product = db.getProduct(item.productId);
                if (product) {
                    const subtotal = product.price * item.quantity;
                    total += subtotal;
                    embed.addFields({
                        name: product.name,
                        value: `Qtd: ${item.quantity} | R$ ${subtotal.toFixed(2)}`,
                        inline: true
                    });
                }
            });

            embed.addFields({
                name: '\u200B',
                value: `**Total: R$ ${total.toFixed(2)}**`,
                inline: false
            });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (interaction.customId === 'checkout') {
            const cart = db.getCart(interaction.user.id);

            if (cart.length === 0) {
                return interaction.reply({
                    content: `${config.emojis.cross} Seu carrinho está vazio!`,
                    ephemeral: true
                });
            }

            const order = db.createOrder(
                interaction.user.id,
                interaction.user.username,
                cart
            );

            const embed = new EmbedBuilder()
                .setTitle(`${config.emojis.check} Pedido Realizado com Sucesso!`)
                .setDescription(`Seu pedido #${order.id} foi criado!`)
                .addFields(
                    { name: 'Total', value: `R$ ${order.total.toFixed(2)}`, inline: true },
                    { name: 'Status', value: order.status, inline: true },
                    { name: 'Itens', value: order.items.length.toString(), inline: true }
                )
                .setColor(config.colors.success)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Notificar no canal de pedidos
            if (config.ordersChannelId) {
                try {
                    const channel = await interaction.client.channels.fetch(config.ordersChannelId);

                    const adminEmbed = new EmbedBuilder()
                        .setTitle(`${config.emojis.order} Novo Pedido #${order.id}`)
                        .setDescription(`Cliente: ${order.username}`)
                        .addFields(
                            { name: 'Total', value: `R$ ${order.total.toFixed(2)}`, inline: true },
                            { name: 'Itens', value: order.items.length.toString(), inline: true }
                        )
                        .setColor(config.colors.warning)
                        .setTimestamp();

                    order.items.forEach(item => {
                        adminEmbed.addFields({
                            name: item.name,
                            value: `Qtd: ${item.quantity} | R$ ${item.subtotal.toFixed(2)}`,
                            inline: true
                        });
                    });

                    await channel.send({ embeds: [adminEmbed] });
                } catch (error) {
                    console.error('Erro ao enviar notificação:', error);
                }
            }
        }

        if (interaction.customId === 'clear_cart') {
            db.clearCart(interaction.user.id);
            return interaction.reply({
                content: `${config.emojis.check} Carrinho limpo com sucesso!`,
                ephemeral: true
            });
        }

        if (interaction.customId.startsWith('copy_pix_')) {
            const paymentId = parseInt(interaction.customId.split('_')[2]);
            const payment = db.payments.find(p => p.id === paymentId);

            if (!payment) return interaction.reply({ content: 'Pagamento não encontrado.', ephemeral: true });

            return interaction.reply({
                content: `Aqui está o código PIX Copia e Cola:\n\`\`\`${payment.pixCode}\`\`\``,
                ephemeral: true
            });
        }
    }

    // Menus de Seleção
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_opening_menu') {
            const category = interaction.values[0];
            const { createTicket } = await import('../services/ticket.js');

            await interaction.deferReply({ ephemeral: true });

            try {
                const { ticket, channel } = await createTicket(
                    interaction.guild,
                    interaction.user.id,
                    interaction.user.username,
                    category
                );

                const embed = new EmbedBuilder()
                    .setTitle(`🎫 Ticket #${ticket.id} - ${category.toUpperCase()}`)
                    .setDescription(`Olá ${interaction.user}, obrigado por abrir um ticket!\nNossa equipe responderá em breve.`)
                    .addFields(
                        { name: 'Categoria', value: category, inline: true },
                        { name: 'Status', value: 'Aberto', inline: true }
                    )
                    .setColor(config.colors.primary)
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`close_ticket_${ticket.id}`)
                            .setLabel('Fechar Ticket')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    );

                await channel.send({ embeds: [embed], components: [row] });

                return interaction.editReply({
                    content: `${config.emojis.check} Ticket criado! Acesse: ${channel}`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Erro ao abrir ticket via menu:', error);
                return interaction.editReply({
                    content: `${config.emojis.cross} Ocorreu um erro ao abrir seu ticket.`,
                    ephemeral: true
                });
            }
        }

        if (interaction.customId.startsWith('product_variation_select_')) {
            const productId = parseInt(interaction.customId.split('_')[3]);
            const variationName = interaction.values[0];
            const product = db.getProduct(productId);
            const variation = product.variations.find(v => v.name === variationName);

            if (!variation) return interaction.reply({ content: 'Variação não encontrada.', ephemeral: true });

            await interaction.deferReply({ ephemeral: true });

            // Criar pedido para esta variação específica
            const order = {
                id: db.orders.length > 0 ? Math.max(...db.orders.map(o => o.id)) + 1 : 1,
                userId: interaction.user.id,
                username: interaction.user.username,
                items: [{
                    productId: product.id,
                    name: `${product.name} (${variation.name})`,
                    price: variation.price,
                    quantity: 1,
                    subtotal: variation.price,
                    content: variation.content || product.content,
                    roleId: variation.roleId || product.roleId
                }],
                total: variation.price,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            db.orders.push(order);
            await db.save();

            // Gerar Pagamento (Mock de PIX por enquanto, integrado com services/payment.js se existir)
            const { createPayment } = await import('../services/payment.js').catch(() => ({ createPayment: null }));

            let paymentEmbed = new EmbedBuilder()
                .setTitle('💳 Checkout - Pagamento')
                .setDescription(`Você selecionou: **${product.name} (${variation.name})**\nValor: **R$ ${variation.price.toFixed(2)}**`)
                .setColor(config.colors.warning)
                .setTimestamp();

            if (createPayment) {
                try {
                    const payment = await createPayment(order.id, interaction.user.id, 'pix', variation.price);

                    paymentEmbed.addFields(
                        { name: '💠 PIX Copia e Cola', value: `\`\`\`${payment.pixCode}\`\`\`` },
                        { name: '⚠️ Aviso', value: 'O pagamento é processado automaticamente. Assim que aprovado, você receberá o produto na sua DM.' }
                    );

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`copy_pix_${payment.id}`)
                            .setLabel('Copiar PIX')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📋')
                    );

                    return interaction.editReply({ embeds: [paymentEmbed], components: [row] });
                } catch (e) {
                    console.error('Erro ao gerar pagamento:', e);
                }
            }

            paymentEmbed.setDescription('Erro ao gerar o PIX. Entre em contato com um administrador.');
            paymentEmbed.setColor(config.colors.error);
            return interaction.editReply({ embeds: [paymentEmbed] });
        }
    }
}
