import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('produtos')
    .setDescription('Visualizar catálogo de produtos da loja');

export async function execute(interaction) {
    const products = db.getAllProducts();

    if (products.length === 0) {
        return interaction.reply({
            content: `${config.emojis.info} Nenhum produto disponível no momento.`,
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.product} Catálogo de Produtos`)
        .setDescription('Confira nossos produtos disponíveis!')
        .setColor(config.colors.primary)
        .setTimestamp();

    products.forEach(product => {
        const stockInfo = product.stock > 10
            ? `${product.stock} unidades`
            : `⚠️ Apenas ${product.stock} unidades`;

        embed.addFields({
            name: `${product.name} - R$ ${product.price.toFixed(2)}`,
            value: `${product.description}\n**Estoque:** ${stockInfo}\n**ID:** ${product.id}`,
            inline: false
        });
    });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('view_cart')
                .setLabel('Ver Carrinho')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(config.emojis.cart)
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}
