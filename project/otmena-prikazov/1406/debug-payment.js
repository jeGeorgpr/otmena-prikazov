const crypto = require('crypto');

console.log('=== ENVIRONMENT CHECK ===');
console.log('TBANK_TERMINAL_KEY:', process.env.TBANK_TERMINAL_KEY || '1749156878739');
console.log('TBANK_SECRET_KEY:', process.env.TBANK_SECRET_KEY || 'dkOUcD8!h$29QOdf');
console.log('========================\n');

const TERMINAL_KEY = '1749156878739';
const SECRET_KEY = 'dkOUcD8!h$29QOdf';

// Проверяем, что секретный ключ правильный
console.log('Secret key length:', SECRET_KEY.length);
console.log('Secret key first 5 chars:', SECRET_KEY.substring(0, 5));
console.log('Secret key last 5 chars:', SECRET_KEY.substring(SECRET_KEY.length - 5));

// Проверяем специальные символы
console.log('Contains special chars:', /[!@#$%^&*(),.?":{}|<>]/.test(SECRET_KEY));
console.log('Special chars in key:', SECRET_KEY.match(/[!@#$%^&*(),.?":{}|<>]/g));
