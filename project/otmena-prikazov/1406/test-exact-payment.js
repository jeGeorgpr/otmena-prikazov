const crypto = require('crypto');

const TERMINAL_KEY = '1749156878739';
const SECRET_KEY = 'dkOUcD8!h$29QOdf';

function generateSignature(params, password) {
  const signParams = { Password: password };
  
  for (const key in params) {
    if (key !== 'Receipt' && key !== 'DATA' && key !== 'Token') {
      signParams[key] = params[key];
    }
  }
  
  const sortedKeys = Object.keys(signParams).sort();
  let signString = '';
  
  for (const key of sortedKeys) {
    const value = signParams[key];
    if (value !== undefined && value !== null) {
      signString += String(value);
    }
  }
  
  console.log('Full signature string:', signString);
  console.log('Parameters included:', sortedKeys);
  
  return crypto.createHash('sha256').update(signString).digest('hex');
}

// Имитируем точные параметры из вашего приложения
const orderId = 'topup-' + Date.now();
const params = {
  TerminalKey: TERMINAL_KEY,
  Amount: 200000, // 2000 рублей в копейках
  OrderId: orderId,
  Description: 'Пополнение баланса на 2000 ₽',
  NotificationURL: 'https://imyrist.ru/api/payments/webhook',
  SuccessURL: 'https://imyrist.ru/payment/success?type=topup',
  FailURL: 'https://imyrist.ru/payment/fail?type=topup',
  DATA: {
    Email: 'test@example.com',
    UserId: 'test-user-id',
    type: 'topup'
  },
  Receipt: {
    Email: 'test@example.com',
    Taxation: 'usn_income',
    Items: [{
      Name: 'Пополнение баланса на 2000 ₽',
      Price: 200000,
      Quantity: 1,
      Amount: 200000,
      Tax: 'none',
      PaymentMethod: 'full_payment',
      PaymentObject: 'service'
    }]
  }
};

const token = generateSignature(params, SECRET_KEY);
const requestBody = { ...params, Token: token };

console.log('\nGenerated token:', token);
console.log('\nMaking request to T-Bank...');

fetch('https://securepay.tinkoff.ru/v2/Init', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(requestBody)
})
.then(res => res.json())
.then(data => {
  console.log('\nResponse:', JSON.stringify(data, null, 2));
  if (data.Success) {
    console.log('\n✅ SUCCESS! Payment URL:', data.PaymentURL);
  } else {
    console.log('\n❌ ERROR:', data.Message, '-', data.Details);
  }
})
.catch(err => console.error('Error:', err));
