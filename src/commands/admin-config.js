import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('admin-config')
    .setDescription('Configurações gerais do bot (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('auto-role')
            .setDescription('Configurar cargo automático para novos membros')
            .addRoleOption(option =>
                option.setName('cargo')
                    .setDescription('Cargo a ser dado')
                    .setRequired(true)
            )
            .addBooleanOption(option =>
                option.setName('ativado')
                    .setDescription('Ativar ou desativar')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('boas-vindas')
            .setDescription('Configurar canal de boas-vindas')
            .addChannelOption(option =>
                option.setName('canal')
                    .setDescription('Canal de mensagens')
                    .setRequired(true)
            )
            .addBooleanOption(option =>
                option.setName('ativado')
                    .setDescription('Ativar ou desativar')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('mensagem')
                    .setDescription('Mensagem (Use {user} e {server})')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ticket')
            .setDescription('Configurar categoria de tickets')
            .addChannelOption(option =>
                option.setName('categoria')
                    .setDescription('Categoria onde os tickets serão abertos')
                    .setRequired(true)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'auto-role') {
        const role = interaction.options.getRole('cargo');
        const enabled = interaction.options.getBoolean('ativado');

        db.config.autoRole = {
            enabled,
            roleId: role.id
        };
        await db.save();

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuração Atualizada')
            .setDescription(`**Auto-Role:** ${enabled ? 'Ativado' : 'Desativado'}\n**Cargo:** <@&${role.id}>`)
            .setColor(config.colors.success)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'boas-vindas') {
        const channel = interaction.options.getChannel('canal');
        const message = interaction.options.getString('mensagem') || 'Seja bem-vindo(a) {user} ao servidor {server}!';
        const enabled = interaction.options.getBoolean('ativado');

        db.config.welcome = {
            enabled,
            channelId: channel.id,
            message
        };
        await db.save();

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuração Atualizada')
            .setDescription(`**Boas-vindas:** ${enabled ? 'Ativado' : 'Desativado'}\n**Canal:** <@#${channel.id}>\n**Mensagem:** ${message}`)
            .setColor(config.colors.success)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'ticket') {
        const category = interaction.options.getChannel('categoria');

        db.config.ticketCategoryId = category.id;
        await db.save();

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Configuração Atualizada')
            .setDescription(`**Categoria de Tickets:** <#${category.id}>`)
            .setColor(config.colors.success)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
}
