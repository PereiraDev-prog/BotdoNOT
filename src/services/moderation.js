import { db } from '../database.js';

// Adicionar aviso
export const addWarning = (userId, username, reason, moderatorId, moderatorName) => {
    const id = db.moderation.length > 0
        ? Math.max(...db.moderation.map(m => m.id)) + 1
        : 1;

    const warning = {
        id,
        type: 'warn',
        userId,
        username,
        reason,
        moderatorId,
        moderatorName,
        createdAt: new Date().toISOString()
    };

    db.moderation.push(warning);
    db.save();
    return warning;
};

// Adicionar punição (mute, kick, ban)
export const addPunishment = (type, userId, username, reason, moderatorId, moderatorName, duration = null) => {
    const id = db.moderation.length > 0
        ? Math.max(...db.moderation.map(m => m.id)) + 1
        : 1;

    const punishment = {
        id,
        type, // 'mute', 'kick', 'ban'
        userId,
        username,
        reason,
        moderatorId,
        moderatorName,
        duration, // em minutos, null = permanente
        expiresAt: duration ? new Date(Date.now() + duration * 60 * 1000).toISOString() : null,
        active: type !== 'kick', // kick não é "ativo"
        createdAt: new Date().toISOString()
    };

    db.moderation.push(punishment);
    db.save();
    return punishment;
};

// Remover punição (unmute, unban)
export const removePunishment = (userId, type) => {
    const punishment = db.moderation
        .filter(m => m.userId === userId && m.type === type && m.active)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    if (punishment) {
        punishment.active = false;
        punishment.removedAt = new Date().toISOString();
        db.save();
    }

    return punishment;
};

// Obter histórico de moderação de um usuário
export const getUserModerationHistory = (userId) => {
    return db.moderation.filter(m => m.userId === userId);
};

// Obter avisos ativos
export const getUserWarnings = (userId) => {
    return db.moderation.filter(m => m.userId === userId && m.type === 'warn');
};

// Verificar se usuário está mutado/banido
export const isUserPunished = (userId, type) => {
    const punishment = db.moderation
        .filter(m => m.userId === userId && m.type === type && m.active)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    if (!punishment) return false;

    // Verificar se expirou
    if (punishment.expiresAt && new Date(punishment.expiresAt) < new Date()) {
        punishment.active = false;
        db.save();
        return false;
    }

    return true;
};

// Limpar punições expiradas
export const cleanExpiredPunishments = () => {
    const now = new Date();
    let cleaned = 0;

    db.moderation.forEach(m => {
        if (m.active && m.expiresAt && new Date(m.expiresAt) < now) {
            m.active = false;
            m.expiredAt = now.toISOString();
            cleaned++;
        }
    });

    if (cleaned > 0) {
        db.save();
    }

    return cleaned;
};

// Estatísticas de moderação
export const getModerationStats = () => {
    const stats = {
        totalWarns: 0,
        totalMutes: 0,
        totalKicks: 0,
        totalBans: 0,
        activeMutes: 0,
        activeBans: 0
    };

    db.moderation.forEach(m => {
        if (m.type === 'warn') stats.totalWarns++;
        if (m.type === 'mute') {
            stats.totalMutes++;
            if (m.active) stats.activeMutes++;
        }
        if (m.type === 'kick') stats.totalKicks++;
        if (m.type === 'ban') {
            stats.totalBans++;
            if (m.active) stats.activeBans++;
        }
    });

    return stats;
};
