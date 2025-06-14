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
  
  console.log('Parameters for signature:', sortedKeys);
  return crypto.createHash('sha256').update(signString).digest('hex');
}

async function testPayment() {
  const params = {
    TerminalKey: TERMINAL_KEY,
    Amount: 10000, // 100 рублей в копейках
    OrderId: `test-${Date.now()}`,
    Description: 'Тестовый платеж',
    Receipt: {
      Email: 'test@example.com',
      Taxation: 'usn_income',
      Items: [{
        Name: 'Тестовый платеж',
        Price: 10000,
        Quantity: 1,
        Amount: 10000,
        Tax: 'none',
        PaymentMethod: 'full_payment',
        PaymentObject: 'service'
      }]
    }
  };

  const token = generateSignature(params, SECRET_KEY);
  const requestBody = { ...params, Token: token };

  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch('https://securepay.tinkoff.ru/v2/Init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.Success && data.PaymentURL) {
      console.log('\n✅ SUCCESS! Payment URL:', data.PaymentURL);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testPayment();
