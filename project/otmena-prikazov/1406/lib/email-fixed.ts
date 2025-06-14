// lib/email-fixed.ts
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Фикс для Яндекса - используем порт 465
const transporter = nodemailer.createTransport({
  host: 'smtp.yandex.ru',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
  tls: {
    rejectUnauthorized: false
  }
})

// Базовый шаблон
const baseTemplate = (content: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #005bff; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0;">imYrist</h1>
      <p style="margin: 5px 0 0 0;">AI-анализ договоров</p>
    </div>
    ${content}
    <div style="padding: 20px; text-align: center; color: #999; font-size: 12px;">
      <p>Это письмо отправлено автоматически. Пожалуйста, не отвечайте на него.</p>
    </div>
  </div>
`

// Упрощенная функция отправки email для восстановления пароля
export async function sendPasswordResetEmail(email: string) {
  try {
    // Генерируем токен
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 час
    
    // Сохраняем токен в БД
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      }
    })
    
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`
    
    const content = `
      <div style="padding: 30px; background-color: #f5f5f5;">
        <h2 style="color: #333; margin-top: 0;">Восстановление пароля</h2>
        <p style="color: #666;">
          Для создания нового пароля нажмите на кнопку ниже:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 15px 30px; background-color: #005bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Создать новый пароль
          </a>
        </div>
        <p style="color: #999; font-size: 14px;">
          Или скопируйте эту ссылку:<br>
          <a href="${resetUrl}" style="color: #005bff; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="color: #999; font-size: 14px;">
          Ссылка действительна 1 час.
        </p>
      </div>
    `
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM!,
      to: email,
      subject: 'Восстановление пароля - imYrist',
      html: baseTemplate(content)
    })
    
    console.log(`Password reset email sent to ${email}`)
    return true
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    
    // ВРЕМЕННОЕ РЕШЕНИЕ: Если email не работает, показываем ссылку в консоли
    if (process.env.NODE_ENV === 'development') {
      const token = await prisma.verificationToken.findFirst({
        where: { identifier: email },
        orderBy: { expires: 'desc' }
      })
      if (token) {
        console.log('=== RESET LINK (dev mode) ===')
        console.log(`${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token.token}&email=${encodeURIComponent(email)}`)
        console.log('=============================')
      }
    }
    
    throw error
  }
}

// Упрощенные заглушки для остальных функций
export async function sendWelcomeEmail(email: string) {
  console.log(`Welcome email would be sent to ${email}`)
  return true
}

export async function sendAnalysisCompleteEmail(
  userEmail: string,
  contractId: number,
  filename: string,
  status: 'done' | 'error'
) {
  console.log(`Analysis complete email would be sent to ${userEmail}`)
  return true
}

export async function testEmailConfiguration() {
  try {
    await transporter.verify()
    return true
  } catch (error) {
    console.error('Email configuration error:', error)
    return false
  }
}