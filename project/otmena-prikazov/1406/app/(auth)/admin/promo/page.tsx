// app/(auth)/admin/promo/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  Calendar,
  AlertCircle,
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

interface PromoCode {
  id: string
  code: string
  type: 'credit' | 'discount' | 'percentage'
  value: number
  description?: string
  maxUses?: number
  usageCount: number
  validFrom: string
  validUntil?: string
  isActive: boolean
  isSingleUse: boolean
  createdAt: string
  _count: {
    usages: number
  }
  admin?: {
    email: string
  }
}

export default function AdminPromoPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  // Форма создания промокода
  const [formData, setFormData] = useState({
    code: '',
    type: 'credit' as 'credit' | 'discount' | 'percentage',
    value: '',
    description: '',
    maxUses: '',
    validUntil: '',
    isSingleUse: false
  })
  const [isCreating, setIsCreating] = useState(false)

  // Проверка прав администратора
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!session?.user?.id) return

      try {
        const res = await fetch('/api/balance')
        if (res.ok) {
          const data = await res.json()
          setIsAdmin(data.isAdmin)
          if (!data.isAdmin) {
            router.push('/dashboard')
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        router.push('/dashboard')
      }
    }

    if (status === 'authenticated') {
      checkAdminStatus()
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Загрузка промокодов и статистики
  useEffect(() => {
    if (isAdmin) {
      fetchPromoCodes()
      fetchStats()
    }
  }, [isAdmin])

  const fetchPromoCodes = async () => {
    try {
      const res = await fetch('/api/admin/promo')
      if (res.ok) {
        const data = await res.json()
        setPromoCodes(data)
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/promo/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    setFormData({ ...formData, code })
  }

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const res = await fetch('/api/admin/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: Number(formData.value),
          maxUses: formData.maxUses ? Number(formData.maxUses) : null,
          validUntil: formData.validUntil || null
        })
      })

      if (res.ok) {
        await fetchPromoCodes()
        await fetchStats()
        setShowCreateForm(false)
        setFormData({
          code: '',
          type: 'credit',
          value: '',
          description: '',
          maxUses: '',
          validUntil: '',
          isSingleUse: false
        })
      } else {
        const error = await res.json()
        alert(error.error || 'Ошибка при создании промокода')
      }
    } catch (error) {
      console.error('Create error:', error)
      alert('Произошла ошибка')
    } finally {
      setIsCreating(false)
    }
  }

  const togglePromoStatus = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/promo/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (res.ok) {
        await fetchPromoCodes()
      }
    } catch (error) {
      console.error('Toggle status error:', error)
    }
  }

  const deletePromo = async (id: string) => {
    if (!confirm('Удалить промокод? Это действие необратимо.')) return

    try {
      const res = await fetch(`/api/admin/promo/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchPromoCodes()
        await fetchStats()
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit': return 'Начисление'
      case 'discount': return 'Скидка'
      case 'percentage': return 'Процент'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'credit': return 'bg-green-100 text-green-800'
      case 'discount': return 'bg-blue-100 text-blue-800'
      case 'percentage': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isAdmin || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005bff] mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Управление промокодами</h1>
        <div className="flex gap-3">
          <Button 
            onClick={() => router.push('/admin/promo/stats')}
            variant="outline"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Статистика
          </Button>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Создать промокод
          </Button>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Всего промокодов</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Gift className="h-8 w-8 text-gray-400 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Активных</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Использований</p>
                  <p className="text-2xl font-bold">{stats.totalUsages}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Начислено ₽</p>
                  <p className="text-2xl font-bold text-[#005bff]">
                    {new Intl.NumberFormat('ru-RU').format(stats.totalCredited)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#005bff] opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Форма создания */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Создание нового промокода</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Код промокода</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase()
                    })}
                    placeholder="НАПРИМЕР2024"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateRandomCode}
                  >
                    Сгенерировать
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="type">Тип промокода</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Начисление на баланс</SelectItem>
                    <SelectItem value="discount">Фиксированная скидка</SelectItem>
                    <SelectItem value="percentage">Процентная скидка</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="value">
                  {formData.type === 'percentage' ? 'Процент скидки' : 'Сумма (₽)'}
                </Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === 'percentage' ? '10' : '500'}
                  min="0"
                  max={formData.type === 'percentage' ? '100' : undefined}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="maxUses">Макс. использований</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="Не ограничено"
                  min="1"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="validUntil">Действителен до</Label>
                <Input
                  id="validUntil"
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2 mt-6">
                <Switch
                  id="singleUse"
                  checked={formData.isSingleUse}
                  onCheckedChange={(checked) => setFormData({ ...formData, isSingleUse: checked })}
                />
                <Label htmlFor="singleUse">Одноразовый для каждого пользователя</Label>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Описание (опционально)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Например: Новогодняя акция 2024"
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={isCreating || !formData.code || !formData.value}
                >
                  {isCreating ? 'Создание...' : 'Создать промокод'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список промокодов */}
      <Card>
        <CardHeader>
          <CardTitle>Все промокоды</CardTitle>
        </CardHeader>
        <CardContent>
          {promoCodes.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              Промокодов пока нет. Создайте первый!
            </p>
          ) : (
            <div className="space-y-3">
              {promoCodes.map((promo) => (
                <div
                  key={promo.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="font-mono text-lg font-bold">
                          {promo.code}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyCode(promo.code)}
                        >
                          {copiedCode === promo.code ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Badge className={getTypeColor(promo.type)}>
                          {getTypeLabel(promo.type)}
                        </Badge>
                        {promo.isSingleUse && (
                          <Badge variant="outline">Одноразовый</Badge>
                        )}
                        {!promo.isActive && (
                          <Badge variant="destructive">Неактивен</Badge>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Значение:</strong>{' '}
                          {promo.type === 'percentage'
                            ? `${promo.value}%`
                            : `${promo.value} ₽`}
                        </p>
                        {promo.description && (
                          <p><strong>Описание:</strong> {promo.description}</p>
                        )}
                        <p>
                          <strong>Использований:</strong> {promo.usageCount}
                          {promo.maxUses && ` / ${promo.maxUses}`}
                        </p>
                        {promo.validUntil && (
                          <p>
                            <strong>Действителен до:</strong>{' '}
                            {new Date(promo.validUntil).toLocaleString('ru-RU')}
                          </p>
                        )}
                        <p className="text-xs">
                          Создан: {new Date(promo.createdAt).toLocaleString('ru-RU')}
                          {promo.admin && ` • ${promo.admin.email}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={promo.isActive}
                        onCheckedChange={() => togglePromoStatus(promo.id, promo.isActive)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletePromo(promo.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
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