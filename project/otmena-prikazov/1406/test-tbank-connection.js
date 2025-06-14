const https = require('https');

const terminalKey = process.env.TBANK_TERMINAL_KEY || 'YOUR_TERMINAL_KEY';
const password = process.env.TBANK_SECRET_KEY || 'YOUR_SECRET_KEY';

// Тест подключения к T-Bank
const testData = JSON.stringify({
  TerminalKey: terminalKey,
  Amount: 100, // 1 рубль в копейках
  OrderId: 'TEST_' + Date.now(),
  Description: 'Test payment'
});

const options = {
  hostname: 'securepay.tinkoff.ru',
  port: 443,
  path: '/v2/Init',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', JSON.parse(data));
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(testData);
req.end();
