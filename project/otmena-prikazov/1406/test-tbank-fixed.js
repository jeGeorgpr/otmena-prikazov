// test-tbank-fixed.js
const crypto = require('crypto');

// Your production data
const TERMINAL_KEY = '1749156878739';
const SECRET_KEY = 'dkOUcD8!h$29QOdf';

function generateSignature(params, password) {
  const signParams = {};
  
  // Add Password
  signParams.Password = password;
  
  // Copy parameters (excluding Receipt, DATA, Token)
  for (const key in params) {
    if (key !== 'Receipt' && key !== 'DATA' && key !== 'Token') {
      signParams[key] = params[key];
    }
  }
  
  // Sort keys alphabetically
  const sortedKeys = Object.keys(signParams).sort();
  console.log('Keys for signature:', sortedKeys);
  
  // Concatenate values
  let signString = '';
  for (const key of sortedKeys) {
    signString += String(signParams[key]);
  }
  
  console.log('Signature string:', signString);
  
  // Generate SHA-256
  return crypto.createHash('sha256').update(signString).digest('hex');
}

async function testPayment() {
  const params = {
    TerminalKey: TERMINAL_KEY,
    Amount: 19900, // 199 rubles in kopecks
    OrderId: `test-${Date.now()}`,
    Description: 'Тестовый платеж',
    // Add required URLs
    NotificationURL: 'https://imyrist.ru/api/payments/webhook',
    SuccessURL: 'https://imyrist.ru/payment/success?type=test',
    FailURL: 'https://imyrist.ru/payment/fail?type=test',
    // Add DATA field with email
    DATA: {
      Email: 'test@example.com',
      UserId: 'test-user-id'
    },
    // Add the required Receipt
    Receipt: {
      Email: 'test@example.com',
      Taxation: 'usn_income',
      Items: [{
        Name: 'Тестовый платеж',
        Price: 19900,
        Quantity: 1,
        Amount: 19900,
        Tax: 'none',
        PaymentMethod: 'full_payment',
        PaymentObject: 'service'
      }]
    }
  };
  
  const token = generateSignature(params, SECRET_KEY);
  console.log('Generated token:', token);
  
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
      console.log('\n✅ Payment created successfully!');
      console.log('Payment URL:', data.PaymentURL);
      console.log('Payment ID:', data.PaymentId);
    } else {
      console.log('\n❌ Payment creation failed');
      console.log('Error:', data.Message);
      if (data.Details) {
        console.log('Details:', data.Details);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testPayment();