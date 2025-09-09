// backend/src/lib/mp.js
import mpkg from 'mercadopago';

// Desestrutura a partir do default export (CJS)
const { MercadoPagoConfig, Preference, Payment } = mpkg;

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

export const mp = {
  preference: new Preference(mpClient),
  payment: new Payment(mpClient),

  // Wrapper de REFUND usando a API REST oficial (parcial ou total)
  refund: {
    /**
     * create({ payment_id, amount? })
     * - payment_id: string (obrigatório)
     * - amount: number (opcional, valor em reais; se omitido, reembolso TOTAL)
     */
    async create({ payment_id, amount }) {
      if (!payment_id) throw new Error('payment_id is required');

      const body = amount != null ? { amount } : {}; // parcial se amount for informado
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}/refunds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`Refund failed: ${r.status} ${text}`);
      }
      return r.json();
    }
  }
};
