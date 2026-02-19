import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configurar o bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup(group =>
        group
            .setName('boas-vindas')
            .setDescription('Configurar mensagens de boas-vindas')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('ativar')
                    .setDescription('Ativar boas-vindas')
                    .addChannelOption(option =>
                        option.setName('canal')
                            .setDescription('Canal para enviar boas-vindas')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName('mensagem')
                            .setDescription('Mensagem (use {user}, {server}, {count})')
                            .setRequired(false)
                    )
                    .addBooleanOption(option =>
                        option.setName('embed')
                            .setDescription('Usar embed?')
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('desativar')
                    .setDescription('Desativar boas-vindas')
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName('despedida')
            .setDescription('Configurar mensagens de despedida')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('ativar')
                    .setDescription('Ativar despedidas')
                    .addChannelOption(option =>
                        option.setName('canal')
                            .setDescription('Canal para enviar despedidas')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName('mensagem')
                            .setDescription('Mensagem (use {user}, {server})')
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('desativar')
                    .setDescription('Desativar despedidas')
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName('auto-cargo')
            .setDescription('Configurar cargo automático')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('ativar')
                    .setDescription('Ativar auto-cargo')
                    .addRoleOption(option =>
                        option.setName('cargo')
                            .setDescription('Cargo para dar automaticamente')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('desativar')
                    .setDescription('Desativar auto-cargo')
            )
    )
    .addSubcommandGroup(group =>
        group
            .setName('logs')
            .setDescription('Configurar canais de logs')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('membros')
                    .setDescription('Configurar logs de membros')
                    .addChannelOption(option =>
                        option.setName('entradas')
                            .setDescription('Canal para logs de entradas')
                            .setRequired(false)
                    )
                    .addChannelOption(option =>
                        option.setName('saidas')
                            .setDescription('Canal para logs de saídas')
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('mensagens')
                    .setDescription('Configurar logs de mensagens')
                    .addChannelOption(option =>
                        option.setName('canal')
                            .setDescription('Canal para logs de mensagens')
                            .setRequired(true)
                    )
            )
    );

export async function execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (group === 'boas-vindas') {
        if (subcommand === 'ativar') {
            const channel = interaction.options.getChannel('canal');
            const message = interaction.options.getString('mensagem');
            const useEmbed = interaction.options.getBoolean('embed') ?? true;

            db.config.welcome = {
                enabled: true,
                channelId: channel.id,
                message: message || 'Bem-vindo(a) {user} ao servidor {server}! Você é o membro #{count}!',
                embed: useEmbed,
                embedTitle: '👋 Bem-vindo(a)!'
            };

            db.save();

            return interaction.reply({
                content: `${config.emojis.check} Boas-vindas ativadas em ${channel}!`,
                ephemeral: true
            });
        }

        if (subcommand === 'desativar') {
            if (db.config.welcome) {
                db.config.welcome.enabled = false;
                db.save();
            }

            return interaction.reply({
                content: `${config.emojis.check} Boas-vindas desativadas!`,
                ephemeral: true
            });
        }
    }

    if (group === 'despedida') {
        if (subcommand === 'ativar') {
            const channel = interaction.options.getChannel('canal');
            const message = interaction.options.getString('mensagem');

            db.config.goodbye = {
                enabled: true,
                channelId: channel.id,
                message: message || 'Adeus {user}! Esperamos te ver novamente.',
                embed: true
            };

            db.save();

            return interaction.reply({
                content: `${config.emojis.check} Despedidas ativadas em ${channel}!`,
                ephemeral: true
            });
        }

        if (subcommand === 'desativar') {
            if (db.config.goodbye) {
                db.config.goodbye.enabled = false;
                db.save();
            }

            return interaction.reply({
                content: `${config.emojis.check} Despedidas desativadas!`,
                ephemeral: true
            });
        }
    }

    if (group === 'auto-cargo') {
        if (subcommand === 'ativar') {
            const role = interaction.options.getRole('cargo');

            db.config.autoRole = {
                enabled: true,
                roleId: role.id
            };

            db.save();

            return interaction.reply({
                content: `${config.emojis.check} Auto-cargo ativado! Novos membros receberão ${role}`,
                ephemeral: true
            });
        }

        if (subcommand === 'desativar') {
            if (db.config.autoRole) {
                db.config.autoRole.enabled = false;
                db.save();
            }

            return interaction.reply({
                content: `${config.emojis.check} Auto-cargo desativado!`,
                ephemeral: true
            });
        }
    }

    if (group === 'logs') {
        if (subcommand === 'membros') {
            const joinChannel = interaction.options.getChannel('entradas');
            const leaveChannel = interaction.options.getChannel('saidas');

            if (!db.config.logs) db.config.logs = {};

            if (joinChannel) {
                db.config.logs.memberJoin = joinChannel.id;
            }
            if (leaveChannel) {
                db.config.logs.memberLeave = leaveChannel.id;
            }

            db.save();

            return interaction.reply({
                content: `${config.emojis.check} Logs de membros configurados!`,
                ephemeral: true
            });
        }

        if (subcommand === 'mensagens') {
            const channel = interaction.options.getChannel('canal');

            if (!db.config.logs) db.config.logs = {};
            db.config.logs.messages = channel.id;

            db.save();

            return interaction.reply({
                content: `${config.emojis.check} Logs de mensagens configurados em ${channel}!`,
                ephemeral: true
            });
        }
    }
}
