const crypto = require('crypto');

const terminalKey = '1749156878739';
const secretKey = 'dkOUcD8!h$29QOdf';

// Тестовые данные
const data = {
    Amount: 100,
    Description: 'Test payment',
    OrderId: 'test-' + Date.now(),
    TerminalKey: terminalKey
};

// Сортируем ключи
const sortedKeys = Object.keys(data).sort();
const values = [data.Amount, data.Description, data.OrderId, secretKey, terminalKey];
const concatenated = values.join('');

console.log('Values to hash:', values);
console.log('Concatenated string:', concatenated);

// Генерируем токен
const token = crypto.createHash('sha256').update(concatenated).digest('hex');

console.log('Generated token:', token);
console.log('Terminal key:', terminalKey);
console.log('Secret key:', secretKey);
