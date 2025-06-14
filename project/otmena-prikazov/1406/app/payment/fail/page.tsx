'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

function FailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('ErrorCode')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Оплата не удалась</h1>
        <p className="text-gray-600 mb-6">
          К сожалению, платеж не был проведен. Попробуйте еще раз или свяжитесь с поддержкой.
        </p>
        {errorCode && (
          <p className="text-sm text-gray-500 mb-6">
            Код ошибки: {errorCode}
          </p>
        )}
        <div className="space-y-3">
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            Попробовать снова
          </Button>
          <Button variant="outline" onClick={() => router.push('/')} className="w-full">
            На главную
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-6">
          Если проблема повторяется, напишите нам: info@imyrist.ru
        </p>
      </div>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005bff]"></div></div>}>
      <FailContent />
    </Suspense>
  )
}