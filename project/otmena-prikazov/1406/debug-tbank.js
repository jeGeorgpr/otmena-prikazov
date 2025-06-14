// debug-tbank.js
const crypto = require('crypto');

// Ваши данные
const TERMINAL_KEY = '1749156878739';
const SECRET_KEY = 'dkOUcD8!h$29QOdf';

// Функция генерации подписи
function generateSignature(params, password) {
  const signParams = {};
  
  // Добавляем Password
  signParams.Password = password;
  
  // Копируем параметры (кроме Receipt, DATA, Token)
  for (const key in params) {
    if (key !== 'Receipt' && key !== 'DATA' && key !== 'Token') {
      signParams[key] = params[key];
    }
  }
  
  // Сортируем ключи
  const sortedKeys = Object.keys(signParams).sort();
  
  // Конкатенируем значения
  let signString = '';
  for (const key of sortedKeys) {
    signString += String(signParams[key]);
  }
  
  return crypto.createHash('sha256').update(signString).digest('hex');
}

// Проверка переменных окружения
console.log('=== ПРОВЕРКА ОКРУЖЕНИЯ ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('TBANK_TERMINAL_KEY из env:', process.env.TBANK_TERMINAL_KEY);
console.log('TBANK_SECRET_KEY из env:', process.env.TBANK_SECRET_KEY ? '***установлен***' : 'НЕ УСТАНОВЛЕН');
console.log('Жестко заданный TERMINAL_KEY:', TERMINAL_KEY);
console.log('Жестко заданный SECRET_KEY:', SECRET_KEY ? '***установлен***' : 'НЕ УСТАНОВЛЕН');

// Тест создания платежа
async function testCreatePayment() {
  console.log('\n=== ТЕСТ СОЗДАНИЯ ПЛАТЕЖА ===');
  
  const orderId = `test-${Date.now()}`;
  const params = {
    TerminalKey: TERMINAL_KEY,
    Amount: 10000, // 100 рублей
    OrderId: orderId,
    Description: 'Тестовый платеж',
    NotificationURL: 'https://imyrist.ru/api/payments/webhook',
    SuccessURL: 'https://imyrist.ru/payment/success?type=test',
    FailURL: 'https://imyrist.ru/payment/fail?type=test',
    DATA: {
      Email: 'test@example.com',
      UserId: 'test-user'
    },
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
  console.log('Сгенерированный токен:', token);
  
  const requestBody = { ...params, Token: token };
  
  try {
    const response = await fetch('https://securepay.tinkoff.ru/v2/Init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    console.log('Ответ Init:', JSON.stringify(data, null, 2));
    
    if (data.Success && data.PaymentId) {
      console.log('\n✅ Платеж создан успешно!');
      console.log('PaymentId:', data.PaymentId);
      console.log('PaymentURL:', data.PaymentURL);
      
      // Возвращаем PaymentId для проверки статуса
      return data.PaymentId;
    } else {
      console.log('\n❌ Ошибка создания платежа');
      return null;
    }
  } catch (error) {
    console.error('Ошибка запроса:', error);
    return null;
  }
}

// Проверка статуса платежа
async function checkPaymentStatus(paymentId) {
  console.log('\n=== ПРОВЕРКА СТАТУСА ПЛАТЕЖА ===');
  console.log('PaymentId:', paymentId);
  
  const params = {
    TerminalKey: TERMINAL_KEY,
    PaymentId: paymentId
  };
  
  const token = generateSignature(params, SECRET_KEY);
  const requestBody = { ...params, Token: token };
  
  try {
    const response = await fetch('https://securepay.tinkoff.ru/v2/GetState', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    console.log('Ответ GetState:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Ошибка запроса:', error);
    return null;
  }
}

// Тест webhook (эмуляция)
function testWebhookValidation() {
  console.log('\n=== ТЕСТ ВАЛИДАЦИИ WEBHOOK ===');
  
  // Пример данных webhook от T-Bank
  const webhookData = {
    TerminalKey: TERMINAL_KEY,
    OrderId: 'test-order-123',
    Success: true,
    Status: 'AUTHORIZED',
    PaymentId: 123456789,
    Amount: 10000,
    Pan: '430000******0777',
    Token: '' // Будет рассчитан
  };
  
  // Генерируем правильный токен
  const { Token, ...paramsForSign } = webhookData;
  const correctToken = generateSignature(paramsForSign, SECRET_KEY);
  webhookData.Token = correctToken;
  
  console.log('Данные webhook:', webhookData);
  console.log('Токен для проверки:', correctToken);
  
  // Проверяем валидацию
  const isValid = validateWebhook(webhookData);
  console.log('Валидация:', isValid ? '✅ УСПЕШНО' : '❌ ОШИБКА');
}

// Функция валидации webhook
function validateWebhook(params) {
  const { Token, ...checkParams } = params;
  const calculatedToken = generateSignature(checkParams, SECRET_KEY);
  return calculatedToken === Token;
}

// Запускаем тесты
async function runTests() {
  console.log('Запуск диагностики T-Bank...\n');
  
  // Создаем платеж
  const paymentId = await testCreatePayment();
  
  // Если платеж создан, проверяем статус
  if (paymentId) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды
    await checkPaymentStatus(paymentId);
  }
  
  // Тестируем валидацию webhook
  testWebhookValidation();
}

// Запуск
runTests().catch(console.error);