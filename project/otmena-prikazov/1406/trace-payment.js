// Добавим трассировку в сборку
const fs = require('fs');
const buildFile = '/var/www/imyrist/.next/server/app/api/payments/create/route.js';

if (fs.existsSync(buildFile)) {
  let content = fs.readFileSync(buildFile, 'utf8');
  
  // Ищем место где вызывается createPayment
  if (content.includes('createPayment')) {
    console.log('Found createPayment in build file');
    
    // Добавляем логирование перед вызовом
    content = content.replace(
      /const result = await createPayment/g,
      'console.log("DEBUG: Calling createPayment with:", JSON.stringify({orderId: payment.orderId, amount: 199, email: session.user.email, description: `Анализ договора: ${contract.filename}`, userId: session.user.id, contractId: contractId.toString()}, null, 2));\nconst result = await createPayment'
    );
    
    fs.writeFileSync(buildFile, content);
    console.log('Added debug logging to build');
  }
} else {
  console.log('Build file not found');
}
