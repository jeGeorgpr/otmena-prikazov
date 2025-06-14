// app/auth/signin/page.tsx
'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl
      })

      if (result?.error) {
        setError('Неверный email или пароль')
      } else if (result?.ok) {
        router.push(callbackUrl)
      }
    } catch (err) {
      setError('Произошла ошибка при входе')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-[#005bff]">im</span>
            <span className="text-[#e7cb05]">Yrist</span>
          </h1>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Вход в систему
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Или{' '}
            <Link href="/auth/signup" className="font-medium text-[#005bff] hover:text-[#0048cc]">
              создайте новый аккаунт
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#005bff] focus:outline-none focus:ring-[#005bff] sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-[#005bff] focus:outline-none focus:ring-[#005bff] sm:text-sm"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-[#005bff] hover:text-[#0048cc]"
            >
              Забыли пароль?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-md border border-transparent bg-[#005bff] py-2 px-4 text-sm font-medium text-white hover:bg-[#0048cc] focus:outline-none focus:ring-2 focus:ring-[#005bff] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>

          <div className="text-center text-sm text-gray-600 mt-4">
            Продолжая использовать наш сервис, вы соглашаетесь с{' '}
            <Link href="/legal" className="font-medium text-[#005bff] hover:text-[#0048cc]">
              условиями использования
            </Link>{' '}
            и{' '}
            <Link href="/policy" className="font-medium text-[#005bff] hover:text-[#0048cc]">
              политикой конфиденциальности
            </Link>
          </div>

          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-700 font-medium">
              Проблемы со входом?
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Для восстановления доступа напишите нам:
            </p>
            <div className="mt-2 space-y-1">
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
          </div>
        </form>
      </div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005bff] mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}