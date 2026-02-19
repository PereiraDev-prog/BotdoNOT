import { db } from '../database.js';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import dotenv from 'dotenv';
dotenv.config();

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_TOKEN || 'SUA_ACCESS_TOKEN_AQUI',
    options: { timeout: 5000 }
});

const mpPayment = new Payment(client);
const mpPreference = new Preference(client);

// Métodos de Pagamento
export const createPayment = async (orderId, userId, method, amount) => {
    const id = db.payments.length > 0
        ? Math.max(...db.payments.map(p => p.id)) + 1
        : 1;

    const payment = {
        id,
        orderId,
        userId,
        method, // 'pix', 'card'
        amount,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    try {
        if (method === 'pix') {
            const body = {
                transaction_amount: amount,
                description: `Pedido #${orderId} - Loja Discord`,
                payment_method_id: 'pix',
                payer: {
                    email: 'comprador@email.com', // Placeholder, MP exige um email
                },
                notification_url: process.env.WEBHOOK_URL + '/webhooks/mercadopago'
            };

            const response = await mpPayment.create({ body });
            console.log('✅ Resposta Mercado Pago:', JSON.stringify(response, null, 2));

            payment.externalId = response.id;
            payment.pixCode = response.point_of_interaction.transaction_data.qr_code;
            payment.pixQRCode = response.point_of_interaction.transaction_data.qr_code_base64;
            payment.expiresAt = response.date_of_expiration;
        } else if (method === 'card') {
            const body = {
                items: [
                    {
                        id: orderId.toString(),
                        title: `Pedido #${orderId} - Loja Discord`,
                        unit_price: amount,
                        quantity: 1,
                        currency_id: 'BRL'
                    }
                ],
                back_urls: {
                    success: 'https://sua-loja.com/success',
                    failure: 'https://sua-loja.com/failure',
                    pending: 'https://sua-loja.com/pending'
                },
                auto_return: 'approved',
                notification_url: process.env.WEBHOOK_URL + '/webhooks/mercadopago'
            };

            const response = await mpPreference.create({ body });
            payment.externalId = response.id;
            payment.checkoutUrl = response.init_point;
        }

        db.payments.push(payment);
        db.save();
        return payment;
    } catch (error) {
        console.error('❌ Erro ao criar pagamento no Mercado Pago:', error);
        throw error;
    }
};

export const getPayment = (id) => {
    return db.payments.find(p => p.id === id);
};

export const getPaymentByOrder = (orderId) => {
    return db.payments.find(p => p.orderId === orderId);
};

export const getPaymentByExternalId = (externalId) => {
    return db.payments.find(p => p.externalId == externalId);
};

export const updatePaymentStatus = (id, status) => {
    const payment = typeof id === 'object' ? id : getPayment(id);
    if (!payment) return null;

    payment.status = status;
    payment.updatedAt = new Date().toISOString();

    if (status === 'approved' || status === 'completed') {
        payment.status = 'completed';
        payment.completedAt = new Date().toISOString();
        // Atualizar status do pedido
        db.updateOrderStatus(payment.orderId, 'completed');
    }

    db.save();
    return payment;
};

// Webhook handler
export const handlePaymentWebhook = async (id) => {
    try {
        const paymentData = await mpPayment.get({ id });
        const externalId = paymentData.id;
        const status = paymentData.status;

        const payment = getPaymentByExternalId(externalId);
        if (payment) {
            updatePaymentStatus(payment, status);
            return payment;
        }
    } catch (error) {
        console.error('❌ Erro no webhook do Mercado Pago:', error);
    }
    return null;
};
