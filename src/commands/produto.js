import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('produto')
    .setDescription('Ver detalhes de um produto e comprar')
    .addSubcommand(subcommand =>
        subcommand
            .setName('exibir')
            .setDescription('Exibir o embed de venda de um produto')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('ID do produto')
                    .setRequired(true)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'exibir') {
        const id = interaction.options.getInteger('id');
        const product = db.getProduct(id);

        if (!product) {
            return interaction.reply({
                content: `${config.emojis.cross} Produto não encontrado!`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🛒 ${product.name.toUpperCase()}`)
            .setDescription(product.description)
            .setColor(config.colors.primary)
            .setTimestamp();

        if (product.thumbnail) {
            embed.setImage(product.thumbnail);
        }

        // Se tiver variações, mostramos o menu de seleção
        if (product.variations && product.variations.length > 0) {
            const select = new StringSelectMenuBuilder()
                .setCustomId(`product_variation_select_${product.id}`)
                .setPlaceholder('Selecione uma opção para comprar')
                .addOptions(
                    product.variations.map(v => ({
                        label: v.name.toUpperCase(),
                        description: `Preço: R$ ${v.price.toFixed(2)}`,
                        value: v.name,
                        emoji: '💎'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(select);

            return interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }

        // Se não tiver variações, mostramos o preço direto (comportamento legado ou simples)
        embed.addFields(
            { name: 'Preço', value: `R$ ${product.price.toFixed(2)}`, inline: true },
            { name: 'Estoque', value: product.stock.toString(), inline: true }
        );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`add_to_cart_${product.id}`)
                    .setLabel('Adicionar ao Carrinho')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🛒')
            );

        return interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
}
