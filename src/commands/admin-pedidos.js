import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('admin-pedidos')
    .setDescription('Gerenciar pedidos da loja (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('listar')
            .setDescription('Listar todos os pedidos')
            .addStringOption(option =>
                option.setName('status')
                    .setDescription('Filtrar por status')
                    .addChoices(
                        { name: 'Pendente', value: 'pending' },
                        { name: 'Processando', value: 'processing' },
                        { name: 'Concluído', value: 'completed' },
                        { name: 'Cancelado', value: 'cancelled' }
                    )
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('atualizar')
            .setDescription('Atualizar status de um pedido')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('ID do pedido')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('status')
                    .setDescription('Novo status')
                    .addChoices(
                        { name: 'Pendente', value: 'pending' },
                        { name: 'Processando', value: 'processing' },
                        { name: 'Concluído', value: 'completed' },
                        { name: 'Cancelado', value: 'cancelled' }
                    )
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('detalhes')
            .setDescription('Ver detalhes de um pedido')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('ID do pedido')
                    .setRequired(true)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'listar') {
        const statusFilter = interaction.options.getString('status');
        let orders = db.getAllOrders();

        if (statusFilter) {
            orders = orders.filter(o => o.status === statusFilter);
        }

        if (orders.length === 0) {
            return interaction.reply({
                content: `${config.emojis.info} Nenhum pedido encontrado.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.admin} Gerenciar Pedidos`)
            .setDescription(`Total: ${orders.length} pedido(s)`)
            .setColor(config.colors.info)
            .setTimestamp();

        orders.slice(-10).reverse().forEach(order => {
            const statusEmoji = {
                pending: '⏳',
                processing: '🔄',
                completed: '✅',
                cancelled: '❌'
            }[order.status] || '❓';

            embed.addFields({
                name: `#${order.id} - ${statusEmoji} ${order.status}`,
                value: `Cliente: ${order.username}\nTotal: R$ ${order.total.toFixed(2)}\nItens: ${order.items.length}`,
                inline: true
            });
        });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'atualizar') {
        const id = interaction.options.getInteger('id');
        const status = interaction.options.getString('status');

        const order = db.updateOrderStatus(id, status);

        if (!order) {
            return interaction.reply({
                content: `${config.emojis.cross} Pedido não encontrado!`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.check} Pedido Atualizado`)
            .setDescription(`Pedido #${order.id} atualizado para: **${status}**`)
            .addFields(
                { name: 'Cliente', value: order.username, inline: true },
                { name: 'Total', value: `R$ ${order.total.toFixed(2)}`, inline: true }
            )
            .setColor(config.colors.success)
            .setTimestamp();

        // Notificar o cliente
        try {
            const user = await interaction.client.users.fetch(order.userId);
            await user.send({ embeds: [embed] });
        } catch (error) {
            console.log('Não foi possível notificar o cliente');
        }

        return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'detalhes') {
        const id = interaction.options.getInteger('id');
        const order = db.getOrder(id);

        if (!order) {
            return interaction.reply({
                content: `${config.emojis.cross} Pedido não encontrado!`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.order} Pedido #${order.id}`)
            .setDescription(`Cliente: ${order.username}\nStatus: ${order.status}`)
            .setColor(config.colors.info)
            .setTimestamp(new Date(order.createdAt));

        order.items.forEach(item => {
            embed.addFields({
                name: item.name,
                value: `Quantidade: ${item.quantity}\nPreço: R$ ${item.price.toFixed(2)}\nSubtotal: R$ ${item.subtotal.toFixed(2)}`,
                inline: true
            });
        });

        embed.addFields({
            name: '\u200B',
            value: `**Total: R$ ${order.total.toFixed(2)}**`,
            inline: false
        });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
