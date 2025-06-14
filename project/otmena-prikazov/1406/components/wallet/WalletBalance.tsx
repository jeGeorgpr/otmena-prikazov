// components/wallet/WalletBalance.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  Gift,
  History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Transaction {
  id: string
  type: 'deposit' | 'withdraw' | 'analysis' | 'admin_credit' | 'refund'
  amount: number
  balance: number
  description?: string
  createdAt: string
  contract?: {
    filename: string
  }
}

interface WalletData {
  balance: number
  recentTransactions: Transaction[]
  isAdmin: boolean
}

export default function WalletBalance() {
  const router = useRouter()
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWalletData()
  }, [])

  const fetchWalletData = async () => {
    try {
      const response = await fetch('/api/balance')
      if (response.ok) {
        const data = await response.json()
        setWalletData(data)
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
      case 'analysis':
        return <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
      case 'admin_credit':
        return <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
      case 'refund':
        return <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600" />
      default:
        return <History className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-600" />
    }
  }

  const getTransactionLabel = (type: string, transaction: Transaction) => {
    switch (type) {
      case 'deposit': return 'Пополнение'
      case 'analysis': return transaction.contract?.filename || 'Анализ документа'
      case 'admin_credit': return 'Начисление от администратора'
      case 'refund': return 'Возврат'
      default: return type
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 sm:h-12 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-base sm:text-lg">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Баланс кошелька</span>
              <span className="sm:hidden">Кошелек</span>
            </div>
            <Button
              size="sm"
              onClick={() => router.push('/wallet/topup')}
              className="flex items-center gap-1.5 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Пополнить</span>
              <span className="sm:hidden">+</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4 sm:space-y-6">
            {/* Текущий баланс */}
            <div className="text-center py-2 sm:py-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Доступно для анализов</p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#005bff]">
                {formatCurrency(walletData?.balance || 0)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                Достаточно для {Math.floor((walletData?.balance || 0) / 199)} анализов
              </p>
            </div>

            {/* История транзакций */}
            <div>
              <h4 className="font-medium mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Последние операции
              </h4>
              <div className="space-y-2">
                {walletData?.recentTransactions.length === 0 ? (
                  <p className="text-xs sm:text-sm text-gray-500 text-center py-3 sm:py-4">
                    История операций пуста
                  </p>
                ) : (
                  walletData?.recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-2 sm:p-3 border rounded-lg hover:bg-gray-50 gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {getTransactionLabel(transaction.type, transaction)}
                          </p>
                          <p className="text-xs text-gray-500 truncate"
                             title={transaction.description || formatDate(transaction.createdAt)}>
                            {transaction.description || formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm sm:text-base font-medium ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                        </p>
                        <p className="text-xs text-gray-500">
                          Баланс: {formatCurrency(transaction.balance)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Быстрые действия */}
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/wallet/topup')}
                className="w-full text-xs sm:text-sm h-8 sm:h-9"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Пополнить кошелек
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Информация о выгоде */}
      <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
        <p className="text-xs sm:text-sm text-blue-900">
          <strong>Выгодно!</strong> При пополнении от 1000 ₽ вы экономите на каждом анализе.
          Средства не сгорают и всегда доступны для использования.
        </p>
      </div>
    </>
  )
}