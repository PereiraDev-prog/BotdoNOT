import { Events, ActivityType } from 'discord.js';
import { trackInvite } from '../services/invites.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
    console.log(`✅ Bot online como ${client.user.tag}`);

    client.user.setPresence({
        activities: [{
            name: 'sua loja | /produtos',
            type: ActivityType.Watching
        }],
        status: 'online'
    });

    // Cachear convites de todos os servidores
    client.inviteCache = new Map();

    for (const [guildId, guild] of client.guilds.cache) {
        try {
            const invites = await guild.invites.fetch();
            const inviteCache = new Map();

            invites.forEach(invite => {
                inviteCache.set(invite.code, { uses: invite.uses });
                // Registrar no database
                trackInvite(invite.code, invite.inviter?.id, invite.uses);
            });

            client.inviteCache.set(guildId, inviteCache);
            console.log(`📊 Cached ${invites.size} convites para ${guild.name}`);
        } catch (error) {
            console.error(`Erro ao cachear convites de ${guild.name}:`, error);
        }
    }

    console.log('🎉 Bot totalmente inicializado!');
}
