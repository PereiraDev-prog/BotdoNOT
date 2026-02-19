import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('pedidos')
    .setDescription('Ver seus pedidos');

export async function execute(interaction) {
    const orders = db.getUserOrders(interaction.user.id);

    if (orders.length === 0) {
        return interaction.reply({
            content: `${config.emojis.info} Você ainda não fez nenhum pedido.`,
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.order} Seus Pedidos`)
        .setColor(config.colors.primary)
        .setTimestamp();

    orders.slice(-5).reverse().forEach(order => {
        const statusEmoji = {
            pending: '⏳',
            processing: '🔄',
            completed: '✅',
            cancelled: '❌'
        }[order.status] || '❓';

        const date = new Date(order.createdAt).toLocaleDateString('pt-BR');

        embed.addFields({
            name: `Pedido #${order.id} - ${statusEmoji} ${order.status}`,
            value: `Data: ${date}\nTotal: R$ ${order.total.toFixed(2)}\nItens: ${order.items.length}`,
            inline: true
        });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
