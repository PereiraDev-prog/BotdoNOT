import { Events, EmbedBuilder } from 'discord.js';
import { trackInvite, registerMemberJoin } from '../services/invites.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const name = Events.GuildMemberAdd;

export async function execute(member) {
    console.log(`👤 EVENTO JOIN: ${member.user.tag} entrou.`);
    // Rastrear convite usado
    try {
        const invites = await member.guild.invites.fetch();
        const cachedInvites = member.client.inviteCache?.get(member.guild.id) || new Map();

        let usedInvite = null;
        for (const [code, invite] of invites) {
            const cached = cachedInvites.get(code);
            if (cached && invite.uses > cached.uses) {
                usedInvite = invite;
                break;
            }
        }

        if (usedInvite) {
            registerMemberJoin(
                member.id,
                member.user.username,
                usedInvite.code,
                usedInvite.inviter?.id
            );
        }

        // Atualizar cache de convites
        if (!member.client.inviteCache) {
            member.client.inviteCache = new Map();
        }
        const newCache = new Map();
        invites.forEach(invite => {
            newCache.set(invite.code, { uses: invite.uses });
        });
        member.client.inviteCache.set(member.guild.id, newCache);

        // Mensagem de boas-vindas
        const welcomeConfig = db.config.welcome || {};

        if (welcomeConfig.enabled && welcomeConfig.channelId) {
            try {
                const channel = await member.guild.channels.fetch(welcomeConfig.channelId);
                if (!channel) return;

                let message = welcomeConfig.message || 'Bem-vindo(a) {user} ao servidor {server}! Você é o membro #{count}!';

                // Se não houver {user} na mensagem, vamos adicionar no começo para garantir a menção
                if (!message.includes('{user}')) {
                    message = `{user}, ${message}`;
                }

                message = message
                    .replace(/{user}/g, `<@${member.id}>`)
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{count}/g, member.guild.memberCount.toString());

                if (welcomeConfig.embed) {
                    const embed = new EmbedBuilder()
                        .setTitle(welcomeConfig.embedTitle || '👋 Bem-vindo(a)!')
                        .setDescription(message)
                        .setColor(config.colors.success)
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp();

                    if (welcomeConfig.embedImage) {
                        embed.setImage(welcomeConfig.embedImage);
                    }

                    await channel.send({ embeds: [embed] });
                } else {
                    await channel.send(message);
                }
            } catch (error) {
                console.error('Erro ao enviar mensagem de boas-vindas:', error);
            }
        }

        // Auto-role
        const autoRoleConfig = db.config.autoRole || {};
        console.log(`🛠️ Auto-role config: enabled=${autoRoleConfig.enabled}, roleId=${autoRoleConfig.roleId}`);

        if (autoRoleConfig.enabled && autoRoleConfig.roleId) {
            try {
                console.log(`🔍 Tentando dar cargo ${autoRoleConfig.roleId} para ${member.user.tag}...`);
                const role = await member.guild.roles.fetch(autoRoleConfig.roleId);
                if (role) {
                    console.log(`✅ Cargo encontrado: ${role.name}. Adicionando...`);
                    await member.roles.add(role);
                    console.log(`✨ Cargo ${role.name} adicionado com sucesso!`);
                } else {
                    console.log(`❌ Cargo com ID ${autoRoleConfig.roleId} não encontrado no servidor.`);
                }
            } catch (error) {
                console.error(`❌ Erro ao adicionar auto-role: ${error.message} (Code: ${error.code})`);
                if (error.code === 50013) {
                    console.error('⚠️ PERMISSÃO NEGADA: O cargo do Bot deve estar ACIMA do cargo a ser dado!');
                }
            }
        }

        // Registrar log
        if (db.config.logs?.memberJoin) {
            try {
                const logChannel = await member.guild.channels.fetch(db.config.logs.memberJoin);
                if (!logChannel) return;

                const embed = new EmbedBuilder()
                    .setTitle('📥 Membro Entrou')
                    .setDescription(`${member} entrou no servidor`)
                    .addFields(
                        { name: 'Usuário', value: member.user.tag, inline: true },
                        { name: 'ID', value: member.id, inline: true },
                        { name: 'Conta Criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setColor(config.colors.success)
                    .setTimestamp();

                if (usedInvite) {
                    embed.addFields({
                        name: 'Convidado por',
                        value: usedInvite.inviter ? `${usedInvite.inviter.tag}` : 'Desconhecido',
                        inline: true
                    });
                }

                await logChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Erro ao enviar log:', error);
            }
        }
    } catch (error) {
        console.error('Erro no evento GuildMemberAdd:', error);
    }
}
