// app/(auth)/payment/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CreditCard, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contractId = searchParams.get('contractId')
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePayment = async () => {
    if (!contractId) {
      alert('Ошибка: не указан ID контракта')
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contractId: parseInt(contractId) 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания платежа')
      }

      // Редирект на страницу оплаты Т-Банка
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      }

    } catch (error) {
      console.error('Payment error:', error)
      alert(error instanceof Error ? error.message : 'Произошла ошибка при создании платежа')
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Оплата анализа</h1>

      {/* Информация о заказе */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Детали заказа</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Услуга:</span>
              <span className="font-medium">AI-анализ договора</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Стоимость:</span>
              <span className="font-medium">199 ₽</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">НДС:</span>
              <span className="font-medium">Не облагается</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Итого к оплате:</span>
                <span>199 ₽</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Информация о безопасности */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-gray-600 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Безопасная оплата</p>
            <p>Платежи обрабатываются через защищенную систему Т-Банк. 
               Мы не храним данные вашей карты. Все транзакции защищены по стандарту PCI DSS.</p>
          </div>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="space-y-3">
        <Button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
              Переход к оплате...
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5 mr-2" />
              Оплатить картой 199 ₽
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={() => router.back()}
          className="w-full"
        >
          Назад
        </Button>
      </div>

      {/* Информация для юрлиц */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          Для оплаты от юридического лица{' '}
          <a href="/invoice" className="text-[#005bff] hover:underline">
            выставьте счет
          </a>
        </p>
      </div>

      {/* Дисклеймер */}
      <p className="text-xs text-gray-500 text-center mt-6">
        Нажимая "Оплатить", вы соглашаетесь с{' '}
        <a href="/legal" target="_blank" className="text-[#005bff] hover:underline">
          условиями оферты
        </a>{' '}
        и{' '}
        <a href="/legal#privacy" target="_blank" className="text-[#005bff] hover:underline">
          политикой конфиденциальности
        </a>
      </p>
    </div>
  )
}
