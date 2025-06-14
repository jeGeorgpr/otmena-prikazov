import Link from 'next/link'

export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold">
            <span className="text-[#005bff]">im</span>
            <span className="text-[#e7cb05]">Yrist</span>
          </h1>
        </div>

        <div className="rounded-lg bg-green-50 p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Проверьте вашу почту
          </h2>
          
          <p className="mt-2 text-sm text-gray-600">
            Мы отправили ссылку для входа на вашу почту.
            Нажмите на ссылку в письме для входа в систему.
          </p>
          
          <p className="mt-4 text-xs text-gray-500">
            Не получили письмо? Проверьте папку "Спам" или{' '}
            <Link href="/auth/signin" className="text-[#005bff] hover:underline">
              попробуйте еще раз
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
