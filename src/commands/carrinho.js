import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('carrinho')
    .setDescription('Ver seu carrinho de compras');

export async function execute(interaction) {
    const cart = db.getCart(interaction.user.id);

    if (cart.length === 0) {
        return interaction.reply({
            content: `${config.emojis.cart} Seu carrinho está vazio!`,
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.cart} Seu Carrinho`)
        .setColor(config.colors.primary)
        .setTimestamp();

    let total = 0;
    cart.forEach(item => {
        const product = db.getProduct(item.productId);
        if (product) {
            const subtotal = product.price * item.quantity;
            total += subtotal;

            embed.addFields({
                name: product.name,
                value: `Quantidade: ${item.quantity}\nPreço: R$ ${product.price.toFixed(2)}\nSubtotal: R$ ${subtotal.toFixed(2)}`,
                inline: true
            });
        }
    });

    embed.addFields({
        name: '\u200B',
        value: `**Total: R$ ${total.toFixed(2)}**`,
        inline: false
    });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('checkout')
                .setLabel('Finalizar Pedido')
                .setStyle(ButtonStyle.Success)
                .setEmoji(config.emojis.check),
            new ButtonBuilder()
                .setCustomId('clear_cart')
                .setLabel('Limpar Carrinho')
                .setStyle(ButtonStyle.Danger)
                .setEmoji(config.emojis.cross)
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
