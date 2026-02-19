import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import { createTicket, closeTicket, generateTranscript } from '../services/ticket.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gerenciar tickets de suporte')
    .addSubcommand(subcommand =>
        subcommand
            .setName('criar')
            .setDescription('Criar um ticket de suporte')
            .addStringOption(option =>
                option.setName('categoria')
                    .setDescription('Categoria do ticket')
                    .setRequired(true)
                    .addChoices(
                        { name: '💬 Suporte', value: 'suporte' },
                        { name: '🛒 Vendas', value: 'vendas' },
                        { name: '🚨 Denúncia', value: 'denuncia' }
                    )
            )
            .addStringOption(option =>
                option.setName('assunto')
                    .setDescription('Assunto do ticket')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('fechar')
            .setDescription('Fechar o ticket atual')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('setup')
            .setDescription('Enviar a mensagem de abertura de tickets com dropdown')
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'criar') {
        const category = interaction.options.getString('categoria');
        const subject = interaction.options.getString('assunto');

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
                .setDescription(`**Assunto:** ${subject}\n\nOlá ${interaction.user}, obrigado por abrir um ticket!\nNossa equipe responderá em breve.`)
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

            await interaction.editReply({
                content: `${config.emojis.check} Ticket criado! Acesse: ${channel}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Erro ao criar ticket:', error);
            await interaction.editReply({
                content: `${config.emojis.cross} Erro ao criar ticket. Verifique as permissões do bot.`,
                ephemeral: true
            });
        }
    }

    if (subcommand === 'fechar') {
        // Verificar se está em um canal de ticket
        const ticketMatch = interaction.channel.name.match(/ticket-(\d+)-/);
        if (!ticketMatch) {
            return interaction.reply({
                content: `${config.emojis.cross} Este comando só pode ser usado em canais de ticket!`,
                ephemeral: true
            });
        }

        const ticketId = parseInt(ticketMatch[1]);
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

        // Enviar transcript para o usuário
        try {
            const user = await interaction.client.users.fetch(ticket.userId);
            await user.send({
                content: `Seu ticket #${ticketId} foi fechado. Aqui está o histórico:`,
                files: [{
                    attachment: Buffer.from(transcript, 'utf-8'),
                    name: `ticket-${ticketId}-transcript.txt`
                }]
            });
        } catch (error) {
            console.log('Não foi possível enviar transcript para o usuário');
        }

        // Deletar canal após 10 segundos
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (error) {
                console.error('Erro ao deletar canal:', error);
            }
        }, 10000);
    }

    if (subcommand === 'setup') {
        const banner = new AttachmentBuilder('./data/ticket-banner.png');
        const embed = new EmbedBuilder()
            .setTitle('🎫 Tickets')
            .setDescription('***🇧🇷 Para abrir um ticket e receber suporte, clique no botão abaixo. Após isso clique em acessar, então criaremos um canal de texto privado para assistência rápida e segura.\n\n🇺🇸 To open a ticket and receive support, click the button below. After that, click "Access," and we will create a private text channel for quick and secure assistance.***')
            .setColor(config.colors.primary)
            .setThumbnail(interaction.guild.iconURL())
            .setImage('attachment://ticket-banner.png');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_opening_menu')
            .setPlaceholder('Clique aqui para ver as opções')
            .addOptions([
                {
                    label: 'RESGATAR PRODUTO!',
                    description: 'Resgate seu produto!',
                    value: 'resgate',
                    emoji: '📦'
                },
                {
                    label: 'TIRAR DÚVIDAS!',
                    description: 'Tire todas suas dúvidas!',
                    value: 'duvidas',
                    emoji: '🎧'
                },
                {
                    label: 'BUY USDT!',
                    description: 'For people outside Brazil!',
                    value: 'usdt',
                    emoji: '🪙'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.channel.send({ embeds: [embed], components: [row], files: [banner] });

        return interaction.reply({
            content: `${config.emojis.check} Sistema de tickets enviado com sucesso!`,
            ephemeral: true
        });
    }
}
