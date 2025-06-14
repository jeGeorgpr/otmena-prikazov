// app/api/cron/email-notifications/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sendDocumentExpirationWarning, sendBalanceLowEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Verify cron secret
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for documents expiring in 3 days
    await checkExpiringDocuments()
    
    // Check for low balances
    await checkLowBalances()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email notification cron error:', error)
    return NextResponse.json(
      { error: 'Failed to process email notifications' },
      { status: 500 }
    )
  }
}

async function checkExpiringDocuments() {
  try {
    // Get all users with auto-delete enabled
    const users = await prisma.user.findMany({
      where: {
        settings: {
          path: ['autoDeleteDocs'],
          equals: true
        }
      }
    })

    for (const user of users) {
      const settings = user.settings as any
      const deleteAfterDays = settings?.deleteAfterDays || 30
      const warningDays = 3 // Warn 3 days before deletion

      // Calculate the date threshold
      const warningDate = new Date()
      warningDate.setDate(warningDate.getDate() + warningDays)
      
      const deletionDate = new Date()
      deletionDate.setDate(deletionDate.getDate() - (deleteAfterDays - warningDays))

      // Find documents that will expire soon
      const expiringContracts = await prisma.contract.findMany({
        where: {
          userId: user.id,
          createdAt: {
            lte: deletionDate
          },
          status: 'done'
        }
      })

      if (expiringContracts.length > 0) {
        const documents = expiringContracts.map(contract => {
          const daysOld = Math.floor((Date.now() - contract.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          const daysLeft = deleteAfterDays - daysOld
          return {
            filename: contract.filename || 'Без названия',
            daysLeft: Math.max(1, daysLeft)
          }
        })

        await sendDocumentExpirationWarning(user.email, documents)
      }
    }
  } catch (error) {
    console.error('Error checking expiring documents:', error)
  }
}

async function checkLowBalances() {
  try {
    const lowBalanceThreshold = 299 // Cost of one analysis

    // Find users with low balance who haven't been notified recently
    const users = await prisma.user.findMany({
      where: {
        balance: {
          lt: lowBalanceThreshold,
          gt: 0 // Don't notify users with 0 balance
        }
      }
    })

    for (const user of users) {
      // Check if we've sent a low balance email in the last 7 days
      const recentNotification = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
          type: 'low_balance_notification',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })

      if (!recentNotification) {
        await sendBalanceLowEmail(user.email, user.balance)
        
        // Record that we sent a notification
        await prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'low_balance_notification',
            amount: 0,
            balance: user.balance,
            description: 'Low balance notification sent'
          }
        })
      }
    }
  } catch (error) {
    console.error('Error checking low balances:', error)
  }
}
