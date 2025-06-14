// app/(auth)/wallet/history/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Gift,
  History,
  Calendar,
  Download,
  Filter,
  Wallet,
  CreditCard,
  Plus,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Transaction {
  id: string
  type: 'deposit' | 'withdraw' | 'analysis' | 'admin_credit' | 'refund' | 'bonus'
  amount: number
  balance: number
  description?: string
  createdAt: string
  metadata?: any
  contract?: {
    filename: string
  }
  payment?: {
    orderId: string
  }
}

interface TransactionStats {
  totalDeposits: number
  totalSpent: number
  totalAnalyses: number
  currentBalance: number
}

const TRANSACTION_TYPES = {
  all: 'Все операции',
  deposit: 'Пополнения',
  analysis: 'Анализы',
  bonus: 'Бонусы',
  refund: 'Возвраты'
}

export default function WalletHistoryPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    fetchTransactions()
  }, [filter, period])

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('type', filter)
      if (period !== 'all') params.append('period', period)

      const response = await fetch(`/api/wallet/transactions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
      case 'analysis':
        return <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
      case 'bonus':
        return <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
      case 'admin_credit':
        return <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
      case 'refund':
        return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
      default:
        return <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
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

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'text-green-600'
      case 'analysis': return 'text-red-600'
      case 'bonus': return 'text-purple-600'
      case 'admin_credit': return 'text-blue-600'
      case 'refund': return 'text-yellow-600'
      default: return 'text-gray-600'
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

  const exportTransactions = () => {
    const csv = [
      ['Дата', 'Тип', 'Описание', 'Сумма', 'Баланс'].join(','),
      ...transactions.map(t => [
        new Date(t.createdAt).toLocaleString('ru-RU'),
        getTransactionLabel(t.type),
        t.description || '',
        t.amount > 0 ? `+${t.amount}` : t.amount,
        t.balance
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `wallet-history-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005bff]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 md:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-2 sm:mr-4 p-2"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Назад</span>
          </Button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">История операций</h1>
        </div>
        <Button
          variant="outline"
          onClick={exportTransactions}
          disabled={transactions.length === 0}
          size="sm"
          className="self-end sm:self-auto"
        >
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Экспорт</span>
        </Button>
      </div>

      {/* Статистика - адаптивная сетка */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-600">Баланс</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#005bff]">
                    {stats.currentBalance.toLocaleString()}&nbsp;₽
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/wallet/topup')}
                    className="mt-2 h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Пополнить
                  </Button>
                </div>
                <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-[#005bff] opacity-20 hidden sm:block" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Пополнено</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                    {stats.totalDeposits.toLocaleString()}&nbsp;₽
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 opacity-20 hidden sm:block" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Потрачено</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">
                    {stats.totalSpent.toLocaleString()}&nbsp;₽
                  </p>
                </div>
                <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 opacity-20 hidden sm:block" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Анализов</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">
                    {stats.totalAnalyses}
                  </p>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 opacity-20 hidden sm:block" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Фильтры - адаптивный layout */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSACTION_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-full sm:w-[200px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Весь период</SelectItem>
                  <SelectItem value="today">Сегодня</SelectItem>
                  <SelectItem value="week">Последняя неделя</SelectItem>
                  <SelectItem value="month">Последний месяц</SelectItem>
                  <SelectItem value="year">Последний год</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* История транзакций - улучшенная мобильная версия */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">История операций</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Wallet className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">Операций не найдено</p>
              <Button
                onClick={() => router.push('/wallet/topup')}
                className="flex items-center gap-2 mx-auto text-sm"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Пополнить кошелек
              </Button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-2 sm:gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                    <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm sm:text-base">
                          {getTransactionLabel(transaction.type)}
                        </p>
                        {transaction.type === 'bonus' && (
                          <Badge variant="secondary" className="text-xs">
                            Бонус
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {transaction.contract?.filename 
                          ? `Файл: ${truncateFilename(transaction.contract.filename)}`
                          : transaction.description ||
                            (transaction.payment?.orderId && `Заказ: ${transaction.payment.orderId}`)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                        {new Date(transaction.createdAt).toLocaleString('ru-RU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-auto sm:ml-0 flex-shrink-0">
                    <p className={`font-semibold text-base sm:text-lg ${getTransactionColor(transaction.type)}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}&nbsp;₽
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Баланс: {transaction.balance.toLocaleString()}&nbsp;₽
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}