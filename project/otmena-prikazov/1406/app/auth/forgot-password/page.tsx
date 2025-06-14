// app/auth/forgot-password/page.tsx
'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Восстановление пароля
          </h2>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 mb-6">
            К сожалению, автоматическое восстановление пароля временно недоступно.
          </p>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-700 font-medium">
              Для восстановления доступа напишите нам:
            </p>
            <div className="mt-3 space-y-2">
              <a 
                href="https://t.me/imYrist_bot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-sm text-[#005bff] hover:text-[#0048cc]"
              >
                💬 Telegram-бот: https://t.me/imYrist_bot
              </a>
              <a 
                href="mailto:info@imyrist.ru"
                className="block text-sm text-[#005bff] hover:text-[#0048cc]"
              >
                📧 info@imyrist.ru
              </a>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Укажите email вашего аккаунта, и мы поможем восстановить доступ
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-[#005bff] hover:text-[#0048cc] flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Вернуться к входу
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}