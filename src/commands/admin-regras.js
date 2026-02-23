import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('admin-regras')
    .setDescription('Envia as regras da Kronik Store no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    const rulesText = `
Regras
Bem-vindo(a) à comunidade Kronik Store! Para garantir uma boa convivência e uma experiência justa para todos, pedimos que siga atentamente as regras abaixo:

⚠️ **1. Divulgação**
Não é permitido divulgar outros servidores, lojas, sites ou serviços sem autorização da equipe.

👤 **2. Respeito sempre**
Trate todos os membros com cordialidade. Qualquer tipo de ofensa, preconceito ou discurso de ódio não será tolerado.

🧾 **3. Negociações com segurança**
Todas as compras e vendas devem ser feitas exclusivamente através de tickets. Negociações fora do servidor não têm suporte da nossa equipe.

🛠 **4. Suporte oficial**
Dúvidas, problemas ou questões sobre pagamentos devem ser resolvidos somente por tickets. Evite abrir vários tickets ao mesmo tempo para agilizar seu atendimento.

🧠 **5. Clareza no atendimento**
Ao abrir um ticket, informe qual produto adquiriu e envie o comprovante. Assim, poderemos ajudá-lo mais rápido.

💸 **6. Política de Reembolso**
Leia com atenção as informações de compatibilidade antes de efetuar a compra.

Não realizamos reembolso por arrependimento, incompatibilidade ou erro de escolha.
O reembolso só será feito em casos de defeito ou produto inoperante, após avaliação da equipe.
Você tem 24 horas para pedir reembolso.
O reembolso será apenas a metade do valor.
Ao comprar, você automaticamente concorda com esta política.

🔒 **7. Proteção de conteúdo**
É proibido compartilhar, copiar ou vazar ferramentas, produtos ou informações internas. Essa prática resulta em banimento permanente.

⛔ **8. Evite spam e flood**
Mensagens repetitivas, excesso de emojis ou menções desnecessárias atrapalham a convivência e podem gerar punições.

📦 **9. Produtos gratuitos**
Pedidos de “amostra grátis” ou itens sem custo não são aceitos e podem resultar em remoção do servidor.

🔞 **10. Conteúdo inadequado**
Não é permitido postar conteúdo adulto, links suspeitos, malwares, scripts externos ou imagens impróprias.

✅ Ao permanecer no servidor, você concorda com todas as regras acima.
Nosso objetivo é manter um ambiente seguro e organizado.
`;

    const embed = new EmbedBuilder()
        .setTitle('⚖️ Regras da Kronik Store')
        .setDescription(rulesText)
        .setColor(config.colors.primary)
        .setFooter({ text: 'Kronik Store - Todos os direitos reservados' })
        .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });
    return interaction.reply({ content: '✅ Regras postadas com sucesso!', ephemeral: true });
}
