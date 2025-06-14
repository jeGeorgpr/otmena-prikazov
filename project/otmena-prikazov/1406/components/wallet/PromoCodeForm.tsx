// components/wallet/PromoCodeForm.tsx
'use client'

import { useState } from 'react'
import { Gift, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PromoCodeFormProps {
  onSuccess?: (result: {
    type: string
    value: number
    description: string
    newBalance?: number
  }) => void
}

export default function PromoCodeForm({ onSuccess }: PromoCodeFormProps) {
  const [code, setCode] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<any>(null)
  const [checkResult, setCheckResult] = useState<any>(null)

  const handleCheck = async () => {
    if (!code.trim()) {
      setError('Введите промокод')
      return
    }

    setIsChecking(true)
    setError('')
    setCheckResult(null)

    try {
      const res = await fetch('/api/promo/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      })

      const data = await res.json()

      if (data.valid) {
        setCheckResult(data)
      } else {
        setError(data.error || 'Недействительный промокод')
      }
    } catch (error) {
      setError('Ошибка при проверке промокода')
    } finally {
      setIsChecking(false)
    }
  }

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Введите промокод')
      return
    }

    setIsApplying(true)
    setError('')
    setSuccess(null)

    try {
      const res = await fetch('/api/promo/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess(data)
        setCode('')
        setCheckResult(null)
        
        // Вызываем колбэк если передан
        if (onSuccess) {
          onSuccess(data)
        }

        // Обновляем страницу через 2 секунды
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setError(data.error || 'Не удалось применить промокод')
      }
    } catch (error) {
      setError('Ошибка при применении промокода')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Промокод
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Форма ввода */}
          <div className="flex gap-2">
            <Input
              placeholder="Введите промокод"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                setError('')
                setCheckResult(null)
                setSuccess(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !checkResult) {
                  handleCheck()
                }
              }}
              disabled={isChecking || isApplying || success}
              className="font-mono"
            />
            {!checkResult && !success && (
              <Button
                onClick={handleCheck}
                disabled={isChecking || !code.trim()}
                variant="outline"
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Проверить'
                )}
              </Button>
            )}
          </div>

          {/* Результат проверки */}
          {checkResult && !success && (
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="font-medium mb-1">Промокод действителен!</p>
                <p className="text-sm text-gray-700">{checkResult.description}</p>
              </div>
              <Button
                onClick={handleApply}
                disabled={isApplying}
                className="w-full"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Применение...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Применить промокод
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Успешное применение */}
          {success && (
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 mb-1">
                    Промокод успешно применен!
                  </p>
                  <p className="text-sm text-green-700">{success.description}</p>
                  {success.type === 'credit' && success.newBalance !== undefined && (
                    <p className="text-sm text-green-700 mt-1">
                      Новый баланс: {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0
                      }).format(success.newBalance)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Информация о типах промокодов */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Промокоды могут давать:</p>
            <ul className="list-disc list-inside ml-2">
              <li>Начисление средств на баланс</li>
              <li>Скидку на следующий анализ</li>
              <li>Процентную скидку</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}