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
  
  console.log('\n=== SIGNATURE DEBUG ===');
  for (const key of sortedKeys) {
    const value = signParams[key];
    if (value !== undefined && value !== null) {
      console.log(`${key}: ${value}`);
      signString += String(value);
    }
  }
  console.log('\nFull signature string:');
  console.log(signString);
  console.log('======================\n');
  
  return crypto.createHash('sha256').update(signString).digest('hex');
}

async function testPayment() {
  const params = {
    TerminalKey: TERMINAL_KEY,
    Amount: 50000,
    OrderId: 'topup-test-' + Date.now(),
    Description: 'Пополнение баланса на 500 ₽',
    FailURL: 'https://imyrist.ru/payment/fail?type=topup',
    NotificationURL: 'https://imyrist.ru/api/payments/webhook',
    SuccessURL: 'https://imyrist.ru/payment/success?type=topup',
    DATA: {
      Email: 'test@example.com',
      UserId: 'test-user',
      type: 'topup'
    },
    Receipt: {
      Email: 'test@example.com',
      Taxation: 'usn_income',
      Items: [{
        Name: 'Пополнение баланса на 500 ₽',
        Price: 50000,
        Quantity: 1,
        Amount: 50000,
        Tax: 'none',
        PaymentMethod: 'full_payment',
        PaymentObject: 'service'
      }]
    }
  };

  const token = generateSignature(params, SECRET_KEY);
  const requestBody = { ...params, Token: token };

  console.log('Generated token:', token);

  try {
    const response = await fetch('https://securepay.tinkoff.ru/v2/Init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log('\nResponse:', JSON.stringify(data, null, 2));
    
    if (data.Success) {
      console.log('\n✅ SUCCESS! Payment URL:', data.PaymentURL);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testPayment();
