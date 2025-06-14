// Подключаем функцию напрямую
const { createPayment } = require('/var/www/imyrist/.next/server/chunks/2613.js');

// Устанавливаем переменные окружения
process.env.TBANK_TERMINAL_KEY = '1749156878739';
process.env.TBANK_SECRET_KEY = 'dkOUcD8!h$29QOdf';
process.env.NEXTAUTH_URL = 'https://imyrist.ru';

// Тестируем пополнение баланса
async function testTopup() {
  console.log('\n=== TESTING TOPUP PAYMENT ===');
  const result = await createPayment({
    orderId: 'test-topup-' + Date.now(),
    amount: 500,
    email: 'test@example.com',
    description: 'Пополнение баланса на 500 ₽',
    userId: 'test-user',
    metadata: {
      type: 'topup',
      bonus: 25
    }
  });
  console.log('Result:', result);
}

// Тестируем оплату анализа
async function testAnalysis() {
  console.log('\n=== TESTING ANALYSIS PAYMENT ===');
  const result = await createPayment({
    orderId: 'test-analysis-' + Date.now(),
    amount: 199,
    email: 'test@example.com',
    description: 'Анализ договора: test.pdf',
    userId: 'test-user',
    contractId: '123'
  });
  console.log('Result:', result);
}

testTopup().catch(console.error);
// testAnalysis().catch(console.error);
