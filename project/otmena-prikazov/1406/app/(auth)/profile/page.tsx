// app/(auth)/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Mail, 
  Calendar, 
  FileText, 
  LogOut, 
  Settings,
  CreditCard,
  Download,
  Trash2,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ChangePasswordForm from '@/components/profile/ChangePasswordForm'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface UserStats {
  totalAnalyses: number
  lastAnalysis: string | null
  totalSpent: number
  accountCreated: string
}

interface UserSettings {
  emailNotifications: boolean
  autoDeleteDocs: boolean
  deleteAfterDays: number
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    autoDeleteDocs: true,
    deleteAfterDays: 7
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchUserStats()
    fetchUserSettings()
  }, [session, status])

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })
      if (response.ok) {
        setSettings({ ...settings, ...newSettings })
      }
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
      return
    }

    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE'
      })
      if (response.ok) {
        await signOut({ callbackUrl: '/' })
      }
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/user/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `imyrist-data-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005bff]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Личный кабинет</h1>

      {/* Основная информация */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Информация о пользователе
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Email:</span>
            <span className="font-medium">{session?.user?.email}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Дата регистрации:</span>
            <span className="font-medium">
              {stats?.accountCreated ? new Date(stats.accountCreated).toLocaleDateString('ru-RU') : '-'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Статистика использования */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Всего анализов</p>
                <p className="text-2xl font-bold">{stats?.totalAnalyses || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-[#005bff] opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Потрачено</p>
                <p className="text-2xl font-bold">{stats?.totalSpent || 0} ₽</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Последний анализ</p>
                <p className="text-sm font-medium">
                  {stats?.lastAnalysis 
                    ? new Date(stats.lastAnalysis).toLocaleDateString('ru-RU')
                    : 'Нет данных'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

<div className="mb-6">
  <ChangePasswordForm />
</div>

      {/* Настройки */}
      {/* <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Настройки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email уведомления</Label>
              <p className="text-sm text-gray-600">Получать уведомления о готовности анализов</p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => updateSettings({ emailNotifications: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-delete">Автоудаление документов</Label>
              <p className="text-sm text-gray-600">
                Удалять документы через {settings.deleteAfterDays} дней после анализа
              </p>
            </div>
            <Switch
              id="auto-delete"
              checked={settings.autoDeleteDocs}
              onCheckedChange={(checked) => updateSettings({ autoDeleteDocs: checked })}
            />
          </div>
        </CardContent>
      </Card> */}

      {/* Действия с аккаунтом */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Управление данными
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={handleExportData}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Экспортировать данные
            </Button>

            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Выйти из аккаунта
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-4">
              Удаление аккаунта приведет к безвозвратной потере всех данных и истории анализов.
            </p>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Удалить аккаунт
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}