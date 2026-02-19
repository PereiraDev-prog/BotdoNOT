import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { db } from '../database.js';
import { createPayment, getPaymentByOrder } from '../services/payment.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Escolher método de pagamento para seu pedido')
    .addIntegerOption(option =>
        option.setName('pedido')
            .setDescription('ID do pedido')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('metodo')
            .setDescription('Método de pagamento')
            .setRequired(true)
            .addChoices(
                { name: '💳 PIX', value: 'pix' },
                { name: '💳 Cartão de Crédito', value: 'card' },
                { name: '₿ Criptomoeda', value: 'crypto' }
            )
    );

export async function execute(interaction) {
    const orderId = interaction.options.getInteger('pedido');
    const method = interaction.options.getString('metodo');

    const order = db.getOrder(orderId);

    if (!order) {
        return interaction.reply({
            content: `${config.emojis.cross} Pedido não encontrado!`,
            ephemeral: true
        });
    }

    if (order.userId !== interaction.user.id) {
        return interaction.reply({
            content: `${config.emojis.cross} Este pedido não pertence a você!`,
            ephemeral: true
        });
    }

    // Verificar se já existe pagamento
    const existingPayment = getPaymentByOrder(orderId);
    if (existingPayment && existingPayment.status === 'completed') {
        return interaction.reply({
            content: `${config.emojis.check} Este pedido já foi pago!`,
            ephemeral: true
        });
    }

    // Criar pagamento
    await interaction.deferReply({ ephemeral: true });

    try {
        const payment = await createPayment(orderId, interaction.user.id, method, order.total);

        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.money} Pagamento - Pedido #${orderId}`)
            .setDescription(`Método escolhido: **${method.toUpperCase()}**`)
            .addFields(
                { name: 'Valor', value: `R$ ${order.total.toFixed(2)}`, inline: true },
                { name: 'Status', value: 'Aguardando Pagamento', inline: true }
            )
            .setColor(config.colors.warning)
            .setTimestamp();

        if (method === 'pix') {
            if (!payment.pixQRCode) {
                throw new Error('QR Code não gerado pelo Mercado Pago (pixQRCode está vazio)');
            }
            const base64Data = payment.pixQRCode.includes(',') ? payment.pixQRCode.split(',')[1] : payment.pixQRCode;
            const buffer = Buffer.from(base64Data, 'base64');
            const attachment = new AttachmentBuilder(buffer, { name: 'qrcode.png' });

            embed.addFields(
                { name: 'QR Code', value: 'Abra o app do seu banco e escaneie a imagem abaixo:', inline: false },
                { name: 'Validade', value: `Expira em: <t:${Math.floor(new Date(payment.expiresAt).getTime() / 1000)}:R>`, inline: false }
            );

            embed.setImage('attachment://qrcode.png');

            return interaction.editReply({ embeds: [embed], files: [attachment] });
        } else if (method === 'card') {
            embed.addFields(
                { name: 'Link de Checkout', value: 'Clique no botão abaixo para pagar com cartão de forma segura.', inline: false }
            );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Pagar com Cartão')
                        .setStyle(ButtonStyle.Link)
                        .setURL(payment.checkoutUrl)
                );

            return interaction.editReply({ embeds: [embed], components: [row] });
        }
    } catch (error) {
        console.error('❌ Erro no comando pagar:', error);
        return interaction.editReply({
            content: `${config.emojis.cross} Erro ao gerar pagamento. Tente novamente mais tarde.`,
        });
    }
}
