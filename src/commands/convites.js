import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserInviteStats, getInviteLeaderboard } from '../services/invites.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('convites')
    .setDescription('Ver estatísticas de convites')
    .addSubcommand(subcommand =>
        subcommand
            .setName('meus')
            .setDescription('Ver seus convites')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('top')
            .setDescription('Ver ranking de convites')
            .addIntegerOption(option =>
                option.setName('limite')
                    .setDescription('Quantidade de usuários no ranking')
                    .setMinValue(5)
                    .setMaxValue(25)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('usuario')
            .setDescription('Ver convites de um usuário')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuário para verificar')
                    .setRequired(true)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'meus') {
        const stats = getUserInviteStats(interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle(`📊 Seus Convites`)
            .setDescription(`Estatísticas de ${interaction.user}`)
            .addFields(
                { name: 'Total', value: stats.total.toString(), inline: true },
                { name: 'Ativos', value: stats.active.toString(), inline: true },
                { name: 'Saíram', value: stats.left.toString(), inline: true },
                { name: 'Regulares', value: stats.regular.toString(), inline: true },
                { name: 'Fake', value: stats.fake.toString(), inline: true }
            )
            .setColor(config.colors.primary)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'top') {
        const limit = interaction.options.getInteger('limite') || 10;
        const leaderboard = getInviteLeaderboard(limit);

        if (leaderboard.length === 0) {
            return interaction.reply({
                content: `${config.emojis.info} Nenhum convite registrado ainda.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏆 Top ${limit} Convidadores`)
            .setColor(config.colors.warning)
            .setTimestamp();

        let description = '';
        for (let i = 0; i < leaderboard.length; i++) {
            const entry = leaderboard[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

            try {
                const user = await interaction.client.users.fetch(entry.inviterId);
                description += `${medal} **${user.username}** - ${entry.active} convites (${entry.total} total)\n`;
            } catch {
                description += `${medal} Usuário Desconhecido - ${entry.active} convites\n`;
            }
        }

        embed.setDescription(description);
        await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'usuario') {
        const user = interaction.options.getUser('usuario');
        const stats = getUserInviteStats(user.id);

        const embed = new EmbedBuilder()
            .setTitle(`📊 Convites de ${user.username}`)
            .addFields(
                { name: 'Total', value: stats.total.toString(), inline: true },
                { name: 'Ativos', value: stats.active.toString(), inline: true },
                { name: 'Saíram', value: stats.left.toString(), inline: true },
                { name: 'Regulares', value: stats.regular.toString(), inline: true },
                { name: 'Fake', value: stats.fake.toString(), inline: true }
            )
            .setColor(config.colors.info)
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}
