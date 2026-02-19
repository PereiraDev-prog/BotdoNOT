import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../database.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('admin-produto')
    .setDescription('Gerenciar produtos da loja (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('adicionar')
            .setDescription('Adicionar novo produto')
            .addStringOption(option =>
                option.setName('nome')
                    .setDescription('Nome do produto')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('descricao')
                    .setDescription('Descrição do produto')
                    .setRequired(true)
            )
            .addNumberOption(option =>
                option.setName('preco')
                    .setDescription('Preço do produto')
                    .setMinValue(0.01)
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName('estoque')
                    .setDescription('Quantidade em estoque')
                    .setMinValue(0)
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('conteudo')
                    .setDescription('Conteúdo a ser entregue (Ex: link, chave)')
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option.setName('cargo')
                    .setDescription('Cargo a ser dado após a compra')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName('thumbnail')
                    .setDescription('URL da imagem do produto')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('editar')
            .setDescription('Editar produto existente')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('ID do produto')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('nome')
                    .setDescription('Novo nome do produto')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName('descricao')
                    .setDescription('Nova descrição')
                    .setRequired(false)
            )
            .addNumberOption(option =>
                option.setName('preco')
                    .setDescription('Novo preço')
                    .setMinValue(0.01)
                    .setRequired(false)
            )
            .addIntegerOption(option =>
                option.setName('estoque')
                    .setDescription('Novo estoque')
                    .setMinValue(0)
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName('conteudo')
                    .setDescription('Novo conteúdo')
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option.setName('cargo')
                    .setDescription('Novo cargo')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remover')
            .setDescription('Remover produto')
            .addIntegerOption(option =>
                option.setName('id')
                    .setDescription('ID do produto')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('listar')
            .setDescription('Listar todos os produtos')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('variacao-adicionar')
            .setDescription('Adicionar uma variação (ex: 1 Dia) a um produto')
            .addIntegerOption(option =>
                option.setName('produto-id')
                    .setDescription('ID do produto pai')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('nome')
                    .setDescription('Nome da variação (Ex: 1 Dia, Permanente)')
                    .setRequired(true)
            )
            .addNumberOption(option =>
                option.setName('preco')
                    .setDescription('Preço da variação')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('conteudo')
                    .setDescription('Conteúdo para esta variação')
                    .setRequired(false)
            )
            .addRoleOption(option =>
                option.setName('cargo')
                    .setDescription('Cargo para esta variação')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('variacao-remover')
            .setDescription('Remover uma variação de um produto')
            .addIntegerOption(option =>
                option.setName('produto-id')
                    .setDescription('ID do produto')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('nome')
                    .setDescription('Nome da variação para remover')
                    .setRequired(true)
            )
    );

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'adicionar') {
        const name = interaction.options.getString('nome');
        const description = interaction.options.getString('descricao');
        const price = interaction.options.getNumber('preco');
        const stock = interaction.options.getInteger('estoque');
        const contentStr = interaction.options.getString('conteudo');
        const role = interaction.options.getRole('cargo');
        const thumbnail = interaction.options.getString('thumbnail');

        const product = db.addProduct({
            name,
            description: description.replace(/\\n/g, '\n'),
            price,
            stock,
            content: contentStr,
            roleId: role?.id,
            thumbnail,
            variations: [] // Will start empty and can be added later
        });

        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.check} Produto Adicionado`)
            .setDescription(`**${product.name}** foi adicionado ao catálogo!`)
            .addFields(
                { name: 'ID', value: product.id.toString(), inline: true },
                { name: 'Preço', value: `R$ ${product.price.toFixed(2)}`, inline: true },
                { name: 'Estoque', value: product.stock.toString(), inline: true },
                { name: 'Descrição', value: product.description, inline: false }
            )
            .setColor(config.colors.success)
            .setTimestamp();

        if (product.content) embed.addFields({ name: 'Conteúdo', value: '✅ Configurado', inline: true });
        if (product.roleId) embed.addFields({ name: 'Cargo', value: `<@&${product.roleId}>`, inline: true });

        return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'editar') {
        const id = interaction.options.getInteger('id');
        const updates = {};

        const name = interaction.options.getString('nome');
        const description = interaction.options.getString('descricao');
        const price = interaction.options.getNumber('preco');
        const stock = interaction.options.getInteger('estoque');
        const contentStr = interaction.options.getString('conteudo');
        const role = interaction.options.getRole('cargo');

        if (name) updates.name = name;
        if (description) updates.description = description;
        if (price) updates.price = price;
        if (stock !== null) updates.stock = stock;
        if (contentStr) updates.content = contentStr;
        if (role) updates.roleId = role.id;

        const product = db.updateProduct(id, updates);

        if (!product) {
            return interaction.reply({
                content: `${config.emojis.cross} Produto não encontrado!`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.check} Produto Atualizado`)
            .setDescription(`**${product.name}** foi atualizado!`)
            .addFields(
                { name: 'ID', value: product.id.toString(), inline: true },
                { name: 'Preço', value: `R$ ${product.price.toFixed(2)}`, inline: true },
                { name: 'Estoque', value: product.stock.toString(), inline: true }
            )
            .setColor(config.colors.success)
            .setTimestamp();

        if (product.content) embed.addFields({ name: 'Conteúdo', value: '✅ Atualizado', inline: true });
        if (product.roleId) embed.addFields({ name: 'Cargo', value: `<@&${product.roleId}>`, inline: true });

        return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'remover') {
        const id = interaction.options.getInteger('id');
        const success = db.deleteProduct(id);

        if (!success) {
            return interaction.reply({
                content: `${config.emojis.cross} Produto não encontrado!`,
                ephemeral: true
            });
        }

        return interaction.reply({
            content: `${config.emojis.check} Produto removido com sucesso!`,
            ephemeral: true
        });
    }

    if (subcommand === 'listar') {
        const products = db.products;

        if (products.length === 0) {
            return interaction.reply({
                content: `${config.emojis.info} Nenhum produto cadastrado.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.admin} Todos os Produtos`)
            .setColor(config.colors.info)
            .setTimestamp();

        products.forEach(product => {
            embed.addFields({
                name: `[${product.id}] ${product.name}`,
                value: `Preço: R$ ${product.price.toFixed(2)} | Estoque: ${product.stock}`,
                inline: false
            });
        });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'variacao-adicionar') {
        const productId = interaction.options.getInteger('produto-id');
        const name = interaction.options.getString('nome');
        const price = interaction.options.getNumber('preco');
        const content = interaction.options.getString('conteudo');
        const role = interaction.options.getRole('cargo');

        const product = db.getProduct(productId);
        if (!product) return interaction.reply({ content: 'Produto não encontrado!', ephemeral: true });

        if (!product.variations) product.variations = [];

        product.variations.push({
            name,
            price,
            content,
            roleId: role?.id
        });

        await db.save();

        return interaction.reply({
            content: `${config.emojis.check} Variação **${name}** adicionada ao produto **${product.name}**!`,
            ephemeral: true
        });
    }

    if (subcommand === 'variacao-remover') {
        const productId = interaction.options.getInteger('produto-id');
        const name = interaction.options.getString('nome');

        const product = db.getProduct(productId);
        if (!product) return interaction.reply({ content: 'Produto não encontrado!', ephemeral: true });

        if (product.variations) {
            product.variations = product.variations.filter(v => v.name !== name);
            await db.save();
        }

        return interaction.reply({
            content: `${config.emojis.check} Variação **${name}** removida de **${product.name}**!`,
            ephemeral: true
        });
    }
}
