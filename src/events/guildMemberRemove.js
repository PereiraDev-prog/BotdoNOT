import { Events, EmbedBuilder } from 'discord.js';
import { registerMemberLeave } from '../services/invites.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const name = Events.GuildMemberRemove;

export async function execute(member) {
    // Atualizar rastreamento de convites
    registerMemberLeave(member.id);

    // Mensagem de despedida
    const goodbyeConfig = db.config.goodbye || {};

    if (goodbyeConfig.enabled && goodbyeConfig.channelId) {
        try {
            const channel = await member.guild.channels.fetch(goodbyeConfig.channelId);

            let message = goodbyeConfig.message || 'Adeus {user}! Esperamos te ver novamente.';
            message = message
                .replace('{user}', member.user.username)
                .replace('{server}', member.guild.name)
                .replace('{count}', member.guild.memberCount.toString());

            if (goodbyeConfig.embed) {
                const embed = new EmbedBuilder()
                    .setTitle('👋 Até logo!')
                    .setDescription(message)
                    .setColor(config.colors.error)
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();

                await channel.send({ embeds: [embed] });
            } else {
                await channel.send(message);
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem de despedida:', error);
        }
    }

    // Registrar log
    if (db.config.logs?.memberLeave) {
        try {
            const logChannel = await member.guild.channels.fetch(db.config.logs.memberLeave);

            const embed = new EmbedBuilder()
                .setTitle('📤 Membro Saiu')
                .setDescription(`${member.user.tag} saiu do servidor`)
                .addFields(
                    { name: 'Usuário', value: member.user.tag, inline: true },
                    { name: 'ID', value: member.id, inline: true },
                    { name: 'Entrou em', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Desconhecido', inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setColor(config.colors.error)
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao enviar log:', error);
        }
    }
}
