import { db } from '../database.js';

// Criar sorteio
export const createGiveaway = (channelId, prize, duration, winnersCount, requirements = {}) => {
    const id = db.giveaways.length > 0
        ? Math.max(...db.giveaways.map(g => g.id)) + 1
        : 1;

    const giveaway = {
        id,
        channelId,
        messageId: null,
        prize,
        duration, // em minutos
        winnersCount,
        requirements, // { roleId, minLevel, minInvites }
        participants: [],
        winners: [],
        status: 'active', // active, ended
        createdAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + duration * 60 * 1000).toISOString(),
        endedAt: null
    };

    db.giveaways.push(giveaway);
    db.save();
    return giveaway;
};

// Adicionar participante
export const addParticipant = (giveawayId, userId, username) => {
    const giveaway = db.giveaways.find(g => g.id === giveawayId);
    if (!giveaway || giveaway.status !== 'active') return null;

    // Verificar se já está participando
    if (giveaway.participants.find(p => p.userId === userId)) {
        return null;
    }

    giveaway.participants.push({
        userId,
        username,
        joinedAt: new Date().toISOString()
    });

    db.save();
    return giveaway;
};

// Remover participante
export const removeParticipant = (giveawayId, userId) => {
    const giveaway = db.giveaways.find(g => g.id === giveawayId);
    if (!giveaway) return null;

    const index = giveaway.participants.findIndex(p => p.userId === userId);
    if (index !== -1) {
        giveaway.participants.splice(index, 1);
        db.save();
    }

    return giveaway;
};

// Sortear vencedores
export const pickWinners = (giveawayId) => {
    const giveaway = db.giveaways.find(g => g.id === giveawayId);
    if (!giveaway || giveaway.participants.length === 0) return null;

    const winnersCount = Math.min(giveaway.winnersCount, giveaway.participants.length);
    const shuffled = [...giveaway.participants].sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, winnersCount);

    giveaway.winners = winners;
    giveaway.status = 'ended';
    giveaway.endedAt = new Date().toISOString();

    db.save();
    return winners;
};

// Reroll (sortear novos vencedores)
export const rerollWinners = (giveawayId) => {
    const giveaway = db.giveaways.find(g => g.id === giveawayId);
    if (!giveaway || giveaway.status !== 'ended') return null;

    // Remover vencedores anteriores dos participantes
    const previousWinnerIds = giveaway.winners.map(w => w.userId);
    const remainingParticipants = giveaway.participants.filter(
        p => !previousWinnerIds.includes(p.userId)
    );

    if (remainingParticipants.length === 0) return null;

    const winnersCount = Math.min(giveaway.winnersCount, remainingParticipants.length);
    const shuffled = [...remainingParticipants].sort(() => Math.random() - 0.5);
    const newWinners = shuffled.slice(0, winnersCount);

    giveaway.winners = newWinners;
    giveaway.rerolledAt = new Date().toISOString();

    db.save();
    return newWinners;
};

// Encerrar sorteio antecipadamente
export const endGiveaway = (giveawayId) => {
    const giveaway = db.giveaways.find(g => g.id === giveawayId);
    if (!giveaway || giveaway.status !== 'active') return null;

    return pickWinners(giveawayId);
};

// Obter sorteios ativos
export const getActiveGiveaways = () => {
    return db.giveaways.filter(g => g.status === 'active');
};

// Obter sorteio
export const getGiveaway = (id) => {
    return db.giveaways.find(g => g.id === id);
};

// Verificar sorteios que devem encerrar
export const checkExpiredGiveaways = () => {
    const now = new Date();
    const expired = [];

    db.giveaways.forEach(g => {
        if (g.status === 'active' && new Date(g.endsAt) <= now) {
            expired.push(g);
        }
    });

    return expired;
};
