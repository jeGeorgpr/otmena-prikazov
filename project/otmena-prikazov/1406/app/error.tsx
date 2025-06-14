// app/error.tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-bold text-gray-900">500</h1>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900">
            Что-то пошло не так
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Произошла непредвиденная ошибка. Мы уже работаем над её устранением.
          </p>
        </div>
        <div className="mt-5 space-x-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#005bff] hover:bg-[#0048cc] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005bff]"
          >
            Попробовать снова
          </button>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005bff]"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  )
}