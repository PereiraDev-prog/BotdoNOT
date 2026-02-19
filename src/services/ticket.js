import { db } from '../database.js';

// Criar Ticket
export const createTicket = async (guild, userId, username, category = 'suporte') => {
    const id = db.tickets.length > 0
        ? Math.max(...db.tickets.map(t => t.id)) + 1
        : 1;

    const ticket = {
        id,
        userId,
        username,
        category, // suporte, vendas, denuncia
        status: 'open', // open, closed
        channelId: null,
        messages: [],
        createdAt: new Date().toISOString(),
        closedAt: null
    };

    // Criar canal de ticket
    const ticketChannel = await guild.channels.create({
        name: `ticket-${id}-${username}`,
        type: 0, // Text channel
        parent: db.config.ticketCategoryId || null,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: ['ViewChannel']
            },
            {
                id: userId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
            }
        ]
    });

    ticket.channelId = ticketChannel.id;
    db.tickets.push(ticket);
    db.save();

    return { ticket, channel: ticketChannel };
};

// Fechar Ticket
export const closeTicket = async (ticketId, closedBy) => {
    const ticket = db.tickets.find(t => t.id === ticketId);
    if (!ticket) return null;

    ticket.status = 'closed';
    ticket.closedAt = new Date().toISOString();
    ticket.closedBy = closedBy;

    db.save();
    return ticket;
};

// Adicionar mensagem ao histórico
export const addTicketMessage = (ticketId, author, content) => {
    const ticket = db.tickets.find(t => t.id === ticketId);
    if (!ticket) return null;

    ticket.messages.push({
        author,
        content,
        timestamp: new Date().toISOString()
    });

    db.save();
    return ticket;
};

// Gerar transcript
export const generateTranscript = (ticketId) => {
    const ticket = db.tickets.find(t => t.id === ticketId);
    if (!ticket) return null;

    let transcript = `=== TICKET #${ticket.id} ===\n`;
    transcript += `Usuário: ${ticket.username}\n`;
    transcript += `Categoria: ${ticket.category}\n`;
    transcript += `Criado em: ${new Date(ticket.createdAt).toLocaleString('pt-BR')}\n`;
    transcript += `Fechado em: ${ticket.closedAt ? new Date(ticket.closedAt).toLocaleString('pt-BR') : 'N/A'}\n\n`;
    transcript += `=== MENSAGENS ===\n\n`;

    ticket.messages.forEach(msg => {
        transcript += `[${new Date(msg.timestamp).toLocaleString('pt-BR')}] ${msg.author}: ${msg.content}\n`;
    });

    return transcript;
};

// Obter tickets do usuário
export const getUserTickets = (userId) => {
    return db.tickets.filter(t => t.userId === userId);
};

// Obter todos os tickets
export const getAllTickets = () => {
    return db.tickets;
};

// Obter tickets abertos
export const getOpenTickets = () => {
    return db.tickets.filter(t => t.status === 'open');
};
