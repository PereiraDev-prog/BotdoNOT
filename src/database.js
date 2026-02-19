import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');

class Database {
    constructor() {
        this.products = [];
        this.orders = [];
        this.carts = new Map();
        this.payments = [];
        this.tickets = [];
        this.invites = [];
        this.moderation = [];
        this.giveaways = [];
        this.vips = [];
        this.config = {};
        this.logs = [];
        this.init();
    }

    init() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            this.load();
        } catch (error) {
            console.error('Erro ao inicializar database:', error);
        }
    }

    load() {
        const files = {
            products: 'products.json',
            orders: 'orders.json',
            payments: 'payments.json',
            tickets: 'tickets.json',
            invites: 'invites.json',
            moderation: 'moderation.json',
            giveaways: 'giveaways.json',
            vips: 'vips.json',
            config: 'config.json',
            logs: 'logs.json'
        };

        for (const [key, filename] of Object.entries(files)) {
            try {
                const filePath = path.join(DATA_DIR, filename);
                if (fs.existsSync(filePath)) {
                    const data = fs.readFileSync(filePath, 'utf-8');
                    this[key] = JSON.parse(data);
                } else {
                    this[key] = key === 'config' ? {} : [];
                }
            } catch {
                this[key] = key === 'config' ? {} : [];
            }
        }
    }

    async save() {
        const data = {
            products: this.products,
            orders: this.orders,
            payments: this.payments,
            tickets: this.tickets,
            invites: this.invites,
            moderation: this.moderation,
            giveaways: this.giveaways,
            vips: this.vips,
            config: this.config,
            logs: this.logs
        };

        for (const [key, value] of Object.entries(data)) {
            try {
                await fs.promises.writeFile(
                    path.join(DATA_DIR, `${key}.json`),
                    JSON.stringify(value, null, 2)
                );
            } catch (error) {
                console.error(`Erro ao salvar ${key}:`, error);
            }
        }
    }

    // Produtos
    addProduct(product) {
        const id = this.products.length > 0
            ? Math.max(...this.products.map(p => p.id)) + 1
            : 1;

        const newProduct = { id, ...product, createdAt: new Date().toISOString() };
        this.products.push(newProduct);
        this.save();
        return newProduct;
    }

    getProduct(id) {
        return this.products.find(p => p.id === id);
    }

    getAllProducts() {
        return this.products.filter(p => p.stock > 0);
    }

    updateProduct(id, updates) {
        const index = this.products.findIndex(p => p.id === id);
        if (index === -1) return null;

        this.products[index] = { ...this.products[index], ...updates };
        this.save();
        return this.products[index];
    }

    deleteProduct(id) {
        const index = this.products.findIndex(p => p.id === id);
        if (index === -1) return false;

        this.products.splice(index, 1);
        this.save();
        return true;
    }

    // Carrinho
    getCart(userId) {
        if (!this.carts.has(userId)) {
            this.carts.set(userId, []);
        }
        return this.carts.get(userId);
    }

    addToCart(userId, productId, quantity = 1) {
        const product = this.getProduct(productId);
        if (!product || product.stock < quantity) return null;

        const cart = this.getCart(userId);
        const existingItem = cart.find(item => item.productId === productId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ productId, quantity });
        }

        return cart;
    }

    removeFromCart(userId, productId) {
        const cart = this.getCart(userId);
        const index = cart.findIndex(item => item.productId === productId);
        if (index !== -1) {
            cart.splice(index, 1);
        }
        return cart;
    }

    clearCart(userId) {
        this.carts.set(userId, []);
    }

    // Pedidos
    createOrder(userId, username, cart) {
        const id = this.orders.length > 0
            ? Math.max(...this.orders.map(o => o.id)) + 1
            : 1;

        const items = cart.map(item => {
            const product = this.getProduct(item.productId);
            return {
                productId: item.productId,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                subtotal: product.price * item.quantity,
                content: product.content || null,
                roleId: product.roleId || null
            };
        });

        const total = items.reduce((sum, item) => sum + item.subtotal, 0);

        const order = {
            id,
            userId,
            username,
            items,
            total,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Atualizar estoque
        items.forEach(item => {
            const product = this.getProduct(item.productId);
            product.stock -= item.quantity;
        });

        this.orders.push(order);
        this.clearCart(userId);
        this.save();
        return order;
    }

    getOrder(id) {
        return this.orders.find(o => o.id === id);
    }

    getUserOrders(userId) {
        return this.orders.filter(o => o.userId === userId);
    }

    getAllOrders() {
        return this.orders;
    }

    updateOrderStatus(id, status) {
        const order = this.getOrder(id);
        if (!order) return null;

        order.status = status;
        order.updatedAt = new Date().toISOString();
        this.save();
        return order;
    }
}

export const db = new Database();
