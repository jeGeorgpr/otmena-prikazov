// lib/email-yandex-fix.ts
import nodemailer from 'nodemailer'

// Для Яндекса нужны особые настройки
export const createYandexTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 465, // Используем 465 с SSL вместо 587
    secure: true, // true для 465, false для 587
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    tls: {
      // Не проверяем сертификаты (для тестирования)
      rejectUnauthorized: false,
      // Минимальная версия TLS
      minVersion: 'TLSv1.2'
    },
    // Таймауты
    connectionTimeout: 10000, // 10 секунд
    greetingTimeout: 10000,
    socketTimeout: 10000,
  })
}

// Альтернативный вариант для Gmail (если Яндекс не работает)
export const createGmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!, // Для Gmail нужен пароль приложения
    },
  })
}

// Тестовая функция
export async function testEmailConnection() {
  const transporter = createYandexTransporter()
  
  try {
    console.log('Testing SMTP connection...')
    console.log('Host:', process.env.SMTP_HOST)
    console.log('Port:', 465)
    console.log('User:', process.env.SMTP_USER)
    
    const result = await transporter.verify()
    console.log('SMTP connection successful:', result)
    return true
  } catch (error) {
    console.error('SMTP connection failed:', error)
    return false
  }
}