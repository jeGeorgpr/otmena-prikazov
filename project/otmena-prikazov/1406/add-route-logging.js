const fs = require('fs');

// Для wallet/topup
const topupFile = '/var/www/imyrist/app/api/wallet/topup/route.ts';
if (fs.existsSync(topupFile)) {
  let content = fs.readFileSync(topupFile, 'utf8');
  
  // Добавляем логирование перед вызовом createPayment
  content = content.replace(
    'const result = await createPayment({',
    `console.log('TOPUP: Calling createPayment with:', {
      orderId: payment.orderId,
      amount,
      email: session.user.email,
      description: \`Пополнение баланса на \${amount} ₽\`,
      userId: session.user.id,
      metadata: { type: 'topup', bonus }
    });
    const result = await createPayment({`
  );
  
  fs.writeFileSync(topupFile, content);
  console.log('Added logging to topup route');
}

// Для payments/create
const paymentsFile = '/var/www/imyrist/app/api/payments/create/route.ts';
if (fs.existsSync(paymentsFile)) {
  let content = fs.readFileSync(paymentsFile, 'utf8');
  
  content = content.replace(
    'const result = await createPayment({',
    `console.log('PAYMENT: Calling createPayment with:', {
      orderId: payment.orderId,
      amount: 199,
      email: session.user.email,
      description: \`Анализ договора: \${contract.filename}\`,
      userId: session.user.id,
      contractId: contractId.toString()
    });
    const result = await createPayment({`
  );
  
  fs.writeFileSync(paymentsFile, content);
  console.log('Added logging to payments route');
}
