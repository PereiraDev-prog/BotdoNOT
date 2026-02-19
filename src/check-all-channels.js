import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log('🤖 Verificando todos os canais...');

    for (const guild of client.guilds.cache.values()) {
        console.log(`\nServidor: ${guild.name} (${guild.id})`);
        const channels = await guild.channels.fetch();

        console.log('Canais encontrados (Nome: ID [Tipo]):');
        channels.forEach(ch => {
            console.log(`- ${ch.name}: ${ch.id} [${ch.type}]`);
        });
    }

    process.exit();
});

client.login(process.env.TOKEN);
