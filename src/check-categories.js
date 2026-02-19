import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log('🤖 Verificando categorias...');

    for (const guild of client.guilds.cache.values()) {
        console.log(`\nServidor: ${guild.name} (${guild.id})`);
        const channels = await guild.channels.fetch();
        const categories = channels.filter(c => c.type === 4); // 4 = GuildCategory

        console.log('Categorias encontradas:');
        categories.forEach(cat => {
            console.log(`- ${cat.name}: ${cat.id}`);
        });
    }

    process.exit();
});

client.login(process.env.TOKEN);
