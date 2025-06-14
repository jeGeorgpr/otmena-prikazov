// app/(auth)/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Search, 
  Plus, 
  Minus,
  Gift,
  History,
  AlertCircle,
  Key
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface UserData {
  id: string
  email: string
  balance: number
  createdAt: string
  _count: {
    contracts: number
  }
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<UserData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [note, setNote] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check admin status
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

  // Fetch users
  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleBalanceUpdate = async (type: 'credit' | 'debit') => {
    if (!selectedUser || amount <= 0) return

    setIsProcessing(true)
    try {
      const res = await fetch('/api/admin/balance-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          amount: type === 'credit' ? amount : -amount,
          type,
          note
        })
      })

      if (res.ok) {
        // Обновляем список пользователей
        await fetchUsers()
        // Сбрасываем форму
        setSelectedUser(null)
        setAmount(0)
        setNote('')
        alert('Баланс успешно обновлен')
      } else {
        const error = await res.json()
        alert(error.message || 'Ошибка при обновлении баланса')
      }
    } catch (error) {
      console.error('Balance update error:', error)
      alert('Произошла ошибка')
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Доступ запрещен</h2>
          <p className="text-gray-600">У вас нет прав для просмотра этой страницы</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Админ-панель</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/admin/reset-password')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Key className="h-4 w-4" />
            Сброс паролей
          </Button>
          <Button
            onClick={() => router.push('/admin/promo')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Gift className="h-4 w-4" />
            Промокоды
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Список пользователей */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Пользователи</CardTitle>
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Поиск по email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.id === user.id ? 'border-[#005bff] bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-sm text-gray-500">
                            Регистрация: {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#005bff]">
                          {new Intl.NumberFormat('ru-RU', {
                            style: 'currency',
                            currency: 'RUB',
                            minimumFractionDigits: 0
                          }).format(user.balance)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user._count.contracts} анализов
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Управление балансом */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Управление балансом</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedUser ? (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Выбран пользователь:</p>
                    <p className="font-medium">{selectedUser.email}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Текущий баланс: {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0
                      }).format(selectedUser.balance)}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="amount">Сумма операции</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="100"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      placeholder="Введите сумму"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="note">Примечание</Label>
                    <Textarea
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Например: Оплата по счету №123"
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleBalanceUpdate('credit')}
                      disabled={isProcessing || amount <= 0}
                      className="flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Начислить
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleBalanceUpdate('debit')}
                      disabled={isProcessing || amount <= 0 || amount > selectedUser.balance}
                      variant="outline"
                      className="flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                      ) : (
                        <>
                          <Minus className="h-4 w-4" />
                          Списать
                        </>
                      )}
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedUser(null)
                      setAmount(0)
                      setNote('')
                    }}
                    className="w-full"
                  >
                    Отмена
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Gift className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Выберите пользователя для управления балансом</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Статистика */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Статистика
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Всего пользователей:</span>
                  <span className="font-medium">{users.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Общий баланс:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0
                    }).format(users.reduce((sum, user) => sum + user.balance, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Всего анализов:</span>
                  <span className="font-medium">
                    {users.reduce((sum, user) => sum + user._count.contracts, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}