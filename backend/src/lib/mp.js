import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

export const mp = {
  preference: new Preference(mpClient),
  payment: new Payment(mpClient)
};
