'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Ошибка входа
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {error === 'Verification' && 'Ссылка для входа недействительна или истекла'}
            {error === 'Configuration' && 'Ошибка конфигурации'}
            {error === 'AccessDenied' && 'Доступ запрещен'}
            {error === 'Default' && 'Произошла ошибка при входе'}
            {!error && 'Произошла неизвестная ошибка'}
          </p>
          <Link 
            href="/auth/signin" 
            className="mt-4 inline-block text-[#635BFF] hover:text-[#5249CC]"
          >
            Попробовать снова
          </Link>
        </div>
      </div>
    </div>
  )
}