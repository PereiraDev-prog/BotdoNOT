import dotenv from 'dotenv';
dotenv.config();

export const config = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    ordersChannelId: process.env.ORDERS_CHANNEL_ID,
    adminRoleId: process.env.ADMIN_ROLE_ID,
    ticketCategoryId: process.env.TICKET_CATEGORY_ID,

    // Cores para embeds
    colors: {
        primary: 0x5865F2,
        success: 0x57F287,
        warning: 0xFEE75C,
        error: 0xED4245,
        info: 0x5865F2
    },

    // Emojis
    emojis: {
        cart: '🛒',
        product: '📦',
        money: '💰',
        check: '✅',
        cross: '❌',
        info: 'ℹ️',
        admin: '👑',
        user: '👤',
        order: '📋'
    }
};
