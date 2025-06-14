// app/payment/success/page.tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [contractId, setContractId] = useState<string | null>(null)
  const [paymentType, setPaymentType] = useState<string>('analysis')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Получаем параметры из URL
    const id = searchParams.get('contractId')
    const type = searchParams.get('type')
    
    if (id) {
      setContractId(id)
    }
    if (type) {
      setPaymentType(type)
    }
  }, [searchParams])

  useEffect(() => {
    // Обратный отсчет для редиректа
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          
          // Определяем куда редиректить
          if (paymentType === 'topup') {
            router.push('/wallet/history')
          } else if (contractId) {
            router.push(`/dashboard?fromPayment=true&contractId=${contractId}`)
          } else {
            router.push('/dashboard')
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [contractId, paymentType, router])

  const handleContinue = () => {
    if (paymentType === 'topup') {
      router.push('/wallet/history')
    } else if (contractId) {
      router.push(`/dashboard?fromPayment=true&contractId=${contractId}`)
    } else {
      router.push('/dashboard')
    }
  }

  const getSuccessMessage = () => {
    if (paymentType === 'topup') {
      return 'Кошелек успешно пополнен!'
    } else {
      return 'Оплата прошла успешно!'
    }
  }

  const getDescriptionMessage = () => {
    if (paymentType === 'topup') {
      return 'Средства зачислены на ваш баланс'
    } else {
      return 'Анализ вашего документа начнется автоматически'
    }
  }

  const getButtonText = () => {
    if (paymentType === 'topup') {
      return 'Перейти в кошелек'
    } else {
      return 'Продолжить анализ'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getSuccessMessage()}
          </h1>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-600">
            {getDescriptionMessage()}
          </p>
          
          {countdown > 0 ? (
            <p className="text-sm text-gray-500">
              Вы будете автоматически перенаправлены через {countdown} секунд...
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              Перенаправление...
            </p>
          )}

          <div className="pt-4 space-y-3">
            <Button 
              onClick={handleContinue}
              className="w-full"
              size="lg"
            >
              {getButtonText()}
            </Button>
            
            <p className="text-xs text-gray-500">
              Если автоматическое перенаправление не сработало, 
              нажмите кнопку выше
            </p>
          </div>

          {contractId && paymentType !== 'topup' && (
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-400">
                ID документа: {contractId}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005bff] mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}