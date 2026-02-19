import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('adicionar')
    .setDescription('Adicionar produto ao carrinho')
    .addIntegerOption(option =>
        option.setName('id')
            .setDescription('ID do produto')
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option.setName('quantidade')
            .setDescription('Quantidade desejada')
            .setMinValue(1)
            .setRequired(false)
    );

export async function execute(interaction) {
    const productId = interaction.options.getInteger('id');
    const quantity = interaction.options.getInteger('quantidade') || 1;

    const product = db.getProduct(productId);

    if (!product) {
        return interaction.reply({
            content: `${config.emojis.cross} Produto não encontrado!`,
            ephemeral: true
        });
    }

    if (product.stock < quantity) {
        return interaction.reply({
            content: `${config.emojis.cross} Estoque insuficiente! Disponível: ${product.stock} unidades`,
            ephemeral: true
        });
    }

    db.addToCart(interaction.user.id, productId, quantity);

    const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.check} Produto Adicionado ao Carrinho`)
        .setDescription(`**${product.name}** foi adicionado ao seu carrinho!`)
        .addFields(
            { name: 'Quantidade', value: quantity.toString(), inline: true },
            { name: 'Preço Unitário', value: `R$ ${product.price.toFixed(2)}`, inline: true },
            { name: 'Subtotal', value: `R$ ${(product.price * quantity).toFixed(2)}`, inline: true }
        )
        .setColor(config.colors.success)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
