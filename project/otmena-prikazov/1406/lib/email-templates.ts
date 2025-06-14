// lib/email-templates.ts
export const emailSubjects = {
  welcome: 'Добро пожаловать в imYrist!',
  passwordReset: 'Восстановление пароля - imYrist',
  analysisComplete: (filename: string, success: boolean) => 
    success ? `✅ Анализ договора "${filename}" завершен` : `❌ Ошибка при анализе договора "${filename}"`,
  paymentConfirmation: (type: 'analysis' | 'deposit') => 
    type === 'analysis' ? 'Оплата анализа договора подтверждена' : 'Пополнение баланса подтверждено',
  balanceLow: 'Низкий баланс - imYrist',
  documentExpiration: 'Документы скоро будут удалены - imYrist',
} as const