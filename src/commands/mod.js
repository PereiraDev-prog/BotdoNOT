import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { addWarning, addPunishment, removePunishment, getUserModerationHistory } from '../services/moderation.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Comandos de moderação')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(subcommand =>
        subcommand
            .setName('warn')
            .setDescription('Avisar um usuário')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuário para avisar')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('motivo')
                    .setDescription('Motivo do aviso')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('mute')
            .setDescription('Silenciar um usuário')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuário para silenciar')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName('duracao')
                    .setDescription('Duração em minutos (0 = permanente)')
                    .setMinValue(0)
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('motivo')
                    .setDescription('Motivo do mute')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('unmute')
            .setDescription('Remover silenciamento')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuário para remover mute')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('kick')
            .setDescription('Expulsar um usuário')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuário para expulsar')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('motivo')
                    .setDescription('Motivo da expulsão')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ban')
            .setDescription('Banir um usuário')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuário para banir')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('motivo')
                    .setDescription('Motivo do banimento')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName('duracao')
                    .setDescription('Duração em dias (0 = permanente)')
                    .setMinValue(0)
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('historico')
            .setDescription('Ver histórico de moderação')
            .addUserOption(option =>
                option.setName('usuario')
                    .setDescription('Usuário para verificar')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('limpar')
            .setDescription('Limpar mensagens do canal')
            .addIntegerOption(option =>
                option.setName('quantidade')
                    .setDescription('Quantidade de mensagens para limpar (1-100)')
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(100)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'warn') {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo');

        const warning = addWarning(
            user.id,
            user.username,
            reason,
            interaction.user.id,
            interaction.user.username
        );

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ Usuário Avisado`)
            .setDescription(`${user} recebeu um aviso`)
            .addFields(
                { name: 'Motivo', value: reason, inline: false },
                { name: 'Moderador', value: interaction.user.username, inline: true },
                { name: 'ID do Aviso', value: warning.id.toString(), inline: true }
            )
            .setColor(config.colors.warning)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Notificar usuário
        try {
            await user.send({
                content: `Você recebeu um aviso em **${interaction.guild.name}**\n**Motivo:** ${reason}`
            });
        } catch (error) {
            console.log('Não foi possível notificar o usuário');
        }
    }

    if (subcommand === 'mute') {
        const user = interaction.options.getUser('usuario');
        const duration = interaction.options.getInteger('duracao');
        const reason = interaction.options.getString('motivo');
        const member = await interaction.guild.members.fetch(user.id);

        const punishment = addPunishment(
            'mute',
            user.id,
            user.username,
            reason,
            interaction.user.id,
            interaction.user.username,
            duration || null
        );

        // Aplicar timeout do Discord
        const timeoutDuration = duration > 0 ? duration * 60 * 1000 : 28 * 24 * 60 * 60 * 1000; // Max 28 dias
        await member.timeout(timeoutDuration, reason);

        const embed = new EmbedBuilder()
            .setTitle(`🔇 Usuário Silenciado`)
            .setDescription(`${user} foi silenciado`)
            .addFields(
                { name: 'Motivo', value: reason, inline: false },
                { name: 'Duração', value: duration > 0 ? `${duration} minutos` : 'Permanente', inline: true },
                { name: 'Moderador', value: interaction.user.username, inline: true }
            )
            .setColor(config.colors.error)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'unmute') {
        const user = interaction.options.getUser('usuario');
        const member = await interaction.guild.members.fetch(user.id);

        removePunishment(user.id, 'mute');
        await member.timeout(null);

        await interaction.reply({
            content: `${config.emojis.check} ${user} foi desmutado.`,
            ephemeral: true
        });
    }

    if (subcommand === 'kick') {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo');
        const member = await interaction.guild.members.fetch(user.id);

        addPunishment(
            'kick',
            user.id,
            user.username,
            reason,
            interaction.user.id,
            interaction.user.username
        );

        await member.kick(reason);

        const embed = new EmbedBuilder()
            .setTitle(`👢 Usuário Expulso`)
            .setDescription(`${user} foi expulso do servidor`)
            .addFields(
                { name: 'Motivo', value: reason, inline: false },
                { name: 'Moderador', value: interaction.user.username, inline: true }
            )
            .setColor(config.colors.error)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'ban') {
        const user = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('motivo');
        const duration = interaction.options.getInteger('duracao');

        addPunishment(
            'ban',
            user.id,
            user.username,
            reason,
            interaction.user.id,
            interaction.user.username,
            duration ? duration * 24 * 60 : null // converter dias para minutos
        );

        await interaction.guild.members.ban(user.id, { reason });

        const embed = new EmbedBuilder()
            .setTitle(`🔨 Usuário Banido`)
            .setDescription(`${user} foi banido do servidor`)
            .addFields(
                { name: 'Motivo', value: reason, inline: false },
                { name: 'Duração', value: duration > 0 ? `${duration} dias` : 'Permanente', inline: true },
                { name: 'Moderador', value: interaction.user.username, inline: true }
            )
            .setColor(config.colors.error)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'historico') {
        const user = interaction.options.getUser('usuario');
        const history = getUserModerationHistory(user.id);

        if (history.length === 0) {
            return interaction.reply({
                content: `${config.emojis.info} ${user} não possui histórico de moderação.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Histórico de Moderação`)
            .setDescription(`Usuário: ${user}`)
            .setColor(config.colors.info)
            .setTimestamp();

        history.slice(-10).reverse().forEach(entry => {
            const emoji = {
                warn: '⚠️',
                mute: '🔇',
                kick: '👢',
                ban: '🔨'
            }[entry.type] || '❓';

            embed.addFields({
                name: `${emoji} ${entry.type.toUpperCase()} - ID: ${entry.id}`,
                value: `**Motivo:** ${entry.reason}\n**Moderador:** ${entry.moderatorName}\n**Data:** ${new Date(entry.createdAt).toLocaleString('pt-BR')}`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'limpar') {
        const amount = interaction.options.getInteger('quantidade');

        try {
            const messages = await interaction.channel.bulkDelete(amount, true);

            const embed = new EmbedBuilder()
                .setTitle(`${config.emojis.check} Limpeza Concluída`)
                .setDescription(`Foram removidas **${messages.size}** mensagens.`)
                .setColor(config.colors.success)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Registrar log se configurado
            if (config.logsChannelId) {
                try {
                    const logChannel = await interaction.client.channels.fetch(config.logsChannelId);
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🧹 Canal Limpo')
                        .addFields(
                            { name: 'Moderador', value: interaction.user.tag, inline: true },
                            { name: 'Canal', value: interaction.channel.name, inline: true },
                            { name: 'Quantidade Solicitada', value: amount.toString(), inline: true },
                            { name: 'Mensagens Deletadas', value: messages.size.toString(), inline: true }
                        )
                        .setColor(config.colors.info)
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                } catch (logError) {
                    console.error('Erro ao registrar log de limpeza:', logError);
                }
            }
        } catch (error) {
            console.error('Erro ao limpar mensagens:', error);
            return interaction.reply({
                content: `${config.emojis.cross} Ocorreu um erro ao tentar limpar as mensagens. Lembre-se que o Discord não permite deletar mensagens com mais de 14 dias de idade.`,
                ephemeral: true
            });
        }
    }
}
