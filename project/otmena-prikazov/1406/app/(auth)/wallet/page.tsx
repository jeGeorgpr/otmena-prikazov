// app/(auth)/wallet/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import WalletBalance from '@/components/wallet/WalletBalance'
import PromoCodeForm from '@/components/wallet/PromoCodeForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  History,
  FileText,
  Gift,
  CreditCard,
  Loader2
} from 'lucide-react'

interface Transaction {
  id: string
  type: string
  amount: number
  balance: number
  description?: string
  createdAt: string
  contract?: {
    id: number
    filename: string
  }
}

export default function WalletPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentBalance, setCurrentBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Fetch wallet data
  useEffect(() => {
    if (session) {
      fetchWalletData()
    }
  }, [session])

  const fetchWalletData = async () => {
    try {
      // Fetch balance
      const balanceRes = await fetch('/api/balance')
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json()
        setCurrentBalance(balanceData.balance)
      }

      // Fetch transactions - добавляем лимит
      const transactionsRes = await fetch('/api/transactions?limit=10')
      if (transactionsRes.ok) {
        const data = await transactionsRes.json()
        // Проверяем, что data это объект с полем transactions
        if (data.transactions) {
          setTransactions(data.transactions)
        } else if (Array.isArray(data)) {
          // Если вернулся массив напрямую
          setTransactions(data)
        }
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
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'analysis':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'bonus':
      case 'admin_credit':
        return <Gift className="h-4 w-4 text-purple-600" />
      case 'refund':
        return <TrendingUp className="h-4 w-4 text-yellow-600" />
      default:
        return <TrendingDown className="h-4 w-4 text-red-600" />
    }
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Пополнение'
      case 'analysis': return 'Анализ документа'
      case 'bonus': return 'Бонус'
      case 'admin_credit': return 'Начисление'
      case 'refund': return 'Возврат'
      default: return type
    }
  }

  // Функция для обрезки длинных названий файлов
  const truncateFilename = (filename: string, maxLength: number = 30) => {
    if (!filename || filename.length <= maxLength) return filename
    
    const extension = filename.lastIndexOf('.') > 0 ? filename.slice(filename.lastIndexOf('.')) : ''
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'))
    
    if (nameWithoutExt.length > maxLength - extension.length - 3) {
      return nameWithoutExt.slice(0, maxLength - extension.length - 3) + '...' + extension
    }
    
    return filename
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#005bff] mx-auto mb-4" />
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 md:py-8">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">Мой кошелек</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Left column - transactions - на мобильных показываем внизу */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">
          {/* Transactions history */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <History className="h-4 w-4 sm:h-5 sm:w-5" />
                История операций
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center py-6 sm:py-8 text-sm sm:text-base text-gray-500">
                  История операций пуста
                </p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 gap-2 sm:gap-4 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                        <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base">
                            {getTransactionLabel(transaction.type)}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">
                            {transaction.type === 'analysis' && transaction.contract 
                              ? truncateFilename(transaction.contract.filename)
                              : transaction.description || 'Операция по кошельку'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-auto sm:ml-0 flex-shrink-0">
                        <p className={`font-medium text-sm sm:text-base ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                        </p>
                        <p className="text-xs text-gray-500">
                          Баланс: {formatCurrency(transaction.balance)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - balance and promo - на мобильных показываем сверху */}
        <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
          {/* Balance card */}
          <WalletBalance />

          {/* Promo code form */}
          <PromoCodeForm 
            onSuccess={(result) => {
              if (result.type === 'credit' && result.newBalance) {
                setCurrentBalance(result.newBalance)
                // Reload transactions to show the new bonus
                fetchWalletData()
              }
            }}
          />

          {/* Info card */}
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <h3 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Информация</h3>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                <p>• Средства на балансе не сгорают</p>
                <p>• 1 анализ = 199 ₽</p>
                <p>• Выгодно пополнять от 1000 ₽</p>
                <p>• Принимаем карты Visa, Mastercard, МИР</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}