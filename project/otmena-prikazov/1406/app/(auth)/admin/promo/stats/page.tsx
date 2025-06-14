// app/(auth)/admin/promo/stats/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Users,
  BarChart3,
  Download
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PromoStats {
  code: string
  type: string
  totalUsages: number
  totalRevenue: number
  totalBonus: number
  uniqueUsers: number
  createdAt: string
  usages: {
    id: string
    usedAt: string
    userId: string
    userEmail: string
    appliedValue: number
    orderAmount?: number
    transactionType?: string
  }[]
}

export default function PromoStatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<PromoStats[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  useEffect(() => {
    // Устанавливаем даты по умолчанию (последние 30 дней)
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    setDateTo(today.toISOString().split('T')[0])
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchStats()
    }
  }, [dateFrom, dateTo])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/promo/detailed-stats?from=${dateFrom}&to=${dateTo}`)
      
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Промокод', 'Дата использования', 'Пользователь', 'Сумма заказа', 'Примененная скидка/бонус']
    const rows = stats.flatMap(promo => 
      promo.usages.map(usage => [
        promo.code,
        formatDate(usage.usedAt),
        usage.userEmail,
        usage.orderAmount ? formatCurrency(usage.orderAmount) : '-',
        formatCurrency(usage.appliedValue)
      ])
    )
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `promo-stats-${dateFrom}-${dateTo}.csv`
    a.click()
  }

  const selectedPromo = selectedCode ? stats.find(s => s.code === selectedCode) : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
          <h1 className="text-3xl font-bold">Статистика промокодов</h1>
        </div>
        <Button onClick={exportToCSV} disabled={stats.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт в CSV
        </Button>
      </div>

      {/* Фильтры по датам */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Период
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">От</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">До</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <Button onClick={fetchStats}>
              Обновить
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Список промокодов со статистикой */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Промокоды</h2>
            {stats.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  Нет данных за выбранный период
                </CardContent>
              </Card>
            ) : (
              stats.map((promo) => (
                <Card 
                  key={promo.code}
                  className={`cursor-pointer transition-all ${
                    selectedCode === promo.code ? 'ring-2 ring-[#005bff]' : ''
                  }`}
                  onClick={() => setSelectedCode(promo.code)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{promo.code}</h3>
                        <p className="text-sm text-gray-600">
                          {promo.type === 'credit' && 'Начисление на баланс'}
                          {promo.type === 'percentage' && 'Процентная скидка'}
                          {promo.type === 'discount' && 'Фиксированная скидка'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#005bff]">
                          {formatCurrency(promo.totalRevenue)}
                        </p>
                        <p className="text-xs text-gray-500">общий доход</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">Использований</span>
                        </div>
                        <p className="font-semibold">{promo.totalUsages}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">Уникальных</span>
                        </div>
                        <p className="font-semibold">{promo.uniqueUsers}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm">Бонусы</span>
                        </div>
                        <p className="font-semibold">{formatCurrency(promo.totalBonus)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Детальная информация по выбранному промокоду */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Детализация</h2>
            {!selectedPromo ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  Выберите промокод для просмотра деталей
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedPromo.code}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {selectedPromo.usages.map((usage) => (
                      <div key={usage.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{usage.userEmail}</p>
                            <p className="text-sm text-gray-600">
                              {formatDate(usage.usedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            {usage.orderAmount && (
                              <p className="font-semibold">
                                Заказ: {formatCurrency(usage.orderAmount)}
                              </p>
                            )}
                            <p className="text-sm text-green-600">
                              {selectedPromo.type === 'credit' ? 'Начислено: ' : 'Скидка: '}
                              {formatCurrency(usage.appliedValue)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Итоговая статистика */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Всего заказов на сумму:</p>
                        <p className="text-xl font-bold">{formatCurrency(selectedPromo.totalRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Выдано бонусов/скидок:</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(selectedPromo.totalBonus)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}