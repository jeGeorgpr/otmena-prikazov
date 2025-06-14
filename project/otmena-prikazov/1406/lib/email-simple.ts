// /var/www/imyrist/lib/email-simple.ts 
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function sendPasswordResetEmail(email: string) {
  try {
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000)
    
    await prisma.verificationToken.deleteMany({
      where: { identifier: email }
    })
    
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      }
    })
    
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`
    
    console.log('===========================================')
    console.log('ССЫЛКА ДЛЯ ВОССТАНОВЛЕНИЯ ПАРОЛЯ:')
    console.log(resetUrl)
    console.log('===========================================')
    
    return true
  } catch (error) {
    console.error('Failed to create reset token:', error)
    throw error
  }
}

export async function sendWelcomeEmail(email: string) {
  console.log(`Welcome email for: ${email}`)
  return true
}

export async function sendAnalysisCompleteEmail(
  userEmail: string,
  contractId: number,
  filename: string,
  status: 'done' | 'error'
) {
  console.log(`Analysis complete for: ${userEmail}`)
  return true
}

export async function sendPaymentConfirmationEmail(
  userEmail: string,
  amount: number,
  type: 'analysis' | 'deposit',
  contractName?: string
) {
  console.log(`Payment confirmation for: ${userEmail}`)
  return true
}

export async function sendBalanceLowEmail(userEmail: string, currentBalance: number) {
  console.log(`Low balance warning for: ${userEmail}`)
  return true
}

export async function sendDocumentExpirationWarning(
  userEmail: string,
  documents: Array<{ filename: string; daysLeft: number }>
) {
  console.log(`Document expiration warning for: ${userEmail}`)
  return true
}

export async function testEmailConfiguration() {
  console.log('Email is disabled in this temporary solution')
  return false
} 