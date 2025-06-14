const fs = require('fs');
const path = '/var/www/imyrist/lib/payments/tbank.ts';

let content = fs.readFileSync(path, 'utf8');

// Заменяем короткий вывод на полный
content = content.replace(
  "console.log('Signature string:', signString.substring(0, 50) + '...')",
  "console.log('Full signature string:', signString)"
);

// Добавляем вывод сгенерированного токена
content = content.replace(
  "return crypto.createHash('sha256').update(signString).digest('hex')",
  `const hash = crypto.createHash('sha256').update(signString).digest('hex');
  console.log('Generated token:', hash);
  return hash;`
);

fs.writeFileSync(path, content);
console.log('Updated tbank.ts with better logging');
