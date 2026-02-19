import { db } from '../database.js';

// Registrar convite
export const trackInvite = (inviteCode, inviterId, uses = 0) => {
    const existing = db.invites.find(i => i.code === inviteCode);

    if (existing) {
        existing.uses = uses;
        existing.updatedAt = new Date().toISOString();
    } else {
        db.invites.push({
            code: inviteCode,
            inviterId,
            uses,
            members: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    db.save();
};

// Registrar membro que entrou
export const registerMemberJoin = (userId, username, inviteCode, inviterId) => {
    const invite = db.invites.find(i => i.code === inviteCode);

    if (invite) {
        invite.members.push({
            userId,
            username,
            joinedAt: new Date().toISOString(),
            left: false
        });
        invite.uses++;
        invite.updatedAt = new Date().toISOString();
        db.save();
    }

    return invite;
};

// Registrar quando membro sai
export const registerMemberLeave = (userId) => {
    db.invites.forEach(invite => {
        const member = invite.members.find(m => m.userId === userId);
        if (member && !member.left) {
            member.left = true;
            member.leftAt = new Date().toISOString();
            invite.uses = Math.max(0, invite.uses - 1);
        }
    });

    db.save();
};

// Obter estatísticas de convites de um usuário
export const getUserInviteStats = (userId) => {
    const userInvites = db.invites.filter(i => i.inviterId === userId);

    let total = 0;
    let active = 0;
    let left = 0;
    let fake = 0;

    userInvites.forEach(invite => {
        invite.members.forEach(member => {
            total++;
            if (member.left) {
                left++;
            } else {
                active++;
            }

            // Detectar fake (entrou e saiu em menos de 24h)
            if (member.left) {
                const joinTime = new Date(member.joinedAt);
                const leaveTime = new Date(member.leftAt);
                if ((leaveTime - joinTime) < 24 * 60 * 60 * 1000) {
                    fake++;
                }
            }
        });
    });

    return {
        total,
        active,
        left,
        fake,
        regular: active - fake
    };
};

// Leaderboard de convites
export const getInviteLeaderboard = (limit = 10) => {
    const stats = new Map();

    db.invites.forEach(invite => {
        if (!stats.has(invite.inviterId)) {
            stats.set(invite.inviterId, {
                inviterId: invite.inviterId,
                total: 0,
                active: 0
            });
        }

        const userStats = stats.get(invite.inviterId);
        invite.members.forEach(member => {
            userStats.total++;
            if (!member.left) {
                userStats.active++;
            }
        });
    });

    return Array.from(stats.values())
        .sort((a, b) => b.active - a.active)
        .slice(0, limit);
};

// Quem convidou determinado usuário
export const getInviter = (userId) => {
    for (const invite of db.invites) {
        const member = invite.members.find(m => m.userId === userId);
        if (member) {
            return {
                inviterId: invite.inviterId,
                code: invite.code,
                joinedAt: member.joinedAt
            };
        }
    }
    return null;
};
