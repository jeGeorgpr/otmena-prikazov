// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-bold text-gray-900">404</h1>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900">
            Страница не найдена
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Извините, мы не можем найти страницу, которую вы ищете.
          </p>
        </div>
        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#005bff] hover:bg-[#0048cc] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005bff]"
          >
            Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  )
}