import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { createGiveaway, endGiveaway, rerollWinners, getGiveaway } from '../services/giveaway.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('sorteio')
    .setDescription('Gerenciar sorteios')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
        subcommand
            .setName('criar')
            .setDescription('Criar um sorteio')
            .addStringOption(option =>
                option.setName('premio')
                    .setDescription('Prêmio do sorteio')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName('duracao')
                    .setDescription('Duração em minutos')
                    .setMinValue(1)
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName('vencedores')
                    .setDescription('Quantidade de vencedores')
                    .setMinValue(1)
                    .setMaxValue(20)
                    .setRequired(true)
            )
            .addChannelOption(option =>
                option.setName('canal')
                    .setDescription('Canal para o sorteio')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('encerrar')
            .setDescription('Encerrar sorteio antecipadamente')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('ID do sorteio')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('reroll')
            .setDescription('Sortear novos vencedores')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('ID do sorteio')
                    .setRequired(true)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'criar') {
        const prize = interaction.options.getString('premio');
        const duration = interaction.options.getInteger('duracao');
        const winnersCount = interaction.options.getInteger('vencedores');
        const channel = interaction.options.getChannel('canal') || interaction.channel;

        const giveaway = createGiveaway(channel.id, prize, duration, winnersCount);

        const embed = new EmbedBuilder()
            .setTitle('🎉 SORTEIO!')
            .setDescription(`**Prêmio:** ${prize}\n\n**Vencedores:** ${winnersCount}\n**Termina em:** <t:${Math.floor(new Date(giveaway.endsAt).getTime() / 1000)}:R>`)
            .setColor(config.colors.success)
            .setFooter({ text: `ID: ${giveaway.id} | Participantes: 0` })
            .setTimestamp(new Date(giveaway.endsAt));

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`giveaway_join_${giveaway.id}`)
                    .setLabel('Participar')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎉')
            );

        const message = await channel.send({ embeds: [embed], components: [row] });

        // Salvar message ID
        giveaway.messageId = message.id;
        const { db } = await import('../database.js');
        db.save();

        await interaction.reply({
            content: `${config.emojis.check} Sorteio criado em ${channel}!`,
            ephemeral: true
        });
    }

    if (subcommand === 'encerrar') {
        const id = interaction.options.getInteger('id');
        const winners = endGiveaway(id);

        if (!winners) {
            return interaction.reply({
                content: `${config.emojis.cross} Sorteio não encontrado ou já encerrado!`,
                ephemeral: true
            });
        }

        const giveaway = getGiveaway(id);
        const channel = await interaction.client.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(giveaway.messageId);

        const winnersText = winners.map(w => `<@${w.userId}>`).join(', ');

        const embed = new EmbedBuilder()
            .setTitle('🎉 SORTEIO ENCERRADO!')
            .setDescription(`**Prêmio:** ${giveaway.prize}\n\n**Vencedores:**\n${winnersText}`)
            .setColor(config.colors.success)
            .setFooter({ text: `ID: ${giveaway.id} | Participantes: ${giveaway.participants.length}` })
            .setTimestamp();

        await message.edit({ embeds: [embed], components: [] });
        await channel.send(`🎊 Parabéns ${winnersText}! Vocês ganharam: **${giveaway.prize}**`);

        await interaction.reply({
            content: `${config.emojis.check} Sorteio encerrado!`,
            ephemeral: true
        });
    }

    if (subcommand === 'reroll') {
        const id = interaction.options.getInteger('id');
        const newWinners = rerollWinners(id);

        if (!newWinners) {
            return interaction.reply({
                content: `${config.emojis.cross} Não foi possível sortear novos vencedores!`,
                ephemeral: true
            });
        }

        const giveaway = getGiveaway(id);
        const winnersText = newWinners.map(w => `<@${w.userId}>`).join(', ');

        await interaction.reply({
            content: `🔄 Novos vencedores sorteados!\n🎊 Parabéns ${winnersText}! Vocês ganharam: **${giveaway.prize}**`
        });
    }
}
