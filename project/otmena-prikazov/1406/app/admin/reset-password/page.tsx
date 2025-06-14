// app/admin/reset-password/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { User, Key, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminResetPasswordPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [isLoading, setIsLoading] = useState(false)
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

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    
    try {
      const res = await fetch('/api/admin/reset-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setMessage(`Пароль для ${email} успешно изменен на: ${newPassword}`)
        setMessageType('success')
        setEmail('')
        setNewPassword('')
      } else {
        setMessage(data.error || 'Ошибка при сбросе пароля')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Ошибка при сбросе пароля')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(password)
  }

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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => router.push('/admin')}
          className="mb-4"
        >
          ← Вернуться в админ-панель
        </Button>
        <h1 className="text-3xl font-bold">Сброс пароля пользователя</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Сброс пароля
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <Label htmlFor="email">Email пользователя</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="password">Новый пароль</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Минимум 8 символов"
                  minLength={8}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                >
                  Сгенерировать
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Пароль будет показан в открытом виде для копирования
              </p>
            </div>
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Сброс...
                </div>
              ) : (
                'Сбросить пароль'
              )}
            </Button>
          </form>
          
          {message && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              messageType === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {messageType === 'success' ? (
                <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <p className="font-medium">{message}</p>
                {messageType === 'success' && (
                  <p className="mt-1 text-xs">
                    Отправьте эти данные пользователю через Telegram или другой канал связи
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Инструкция</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>1. Введите email пользователя, которому нужно сбросить пароль</p>
          <p>2. Введите новый пароль или сгенерируйте автоматически</p>
          <p>3. После успешного сброса отправьте новый пароль пользователю через:</p>
          <ul className="ml-6 list-disc">
            <li>Telegram-бот: @imYrist_bot</li>
            <li>WhatsApp или другой мессенджер</li>
            <li>Телефонный звонок</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}