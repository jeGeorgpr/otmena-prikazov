// app/(auth)/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Stepper from '@/components/dashboard/Stepper'
import UnifiedUploadForm from '@/components/dashboard/UnifiedUploadForm'
import WalletBalance from '@/components/wallet/WalletBalance'
import { Wallet, CreditCard, AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Step = 1 | 2 | 3 | 4 | 5

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [step, setStep] = useState<Step>(1)
  const [contractId, setContractId] = useState<number | null>(null)
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(true)
  const [userBalance, setUserBalance] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'direct'>('balance')
  const [showPaymentChoice, setShowPaymentChoice] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Fetch user balance
  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/balance')
      if (res.ok) {
        const data = await res.json()
        setUserBalance(data.balance)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  useEffect(() => {
    if (session) {
      fetchBalance()
    }
  }, [session])

  // Check for payment configuration on mount
  useEffect(() => {
    const checkPaymentConfig = async () => {
      try {
        const res = await fetch('/api/config/payment-status')
        if (res.ok) {
          const data = await res.json()
          setIsPaymentEnabled(data.enabled)
        }
      } catch (error) {
        setIsPaymentEnabled(false)
      }
    }
    
    checkPaymentConfig()
  }, [])

  // Poll for contract status
  useEffect(() => {
    if (!contractId || step < 3) return

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/contracts/${contractId}/status`)
        if (!res.ok) return

        const data = await res.json()

        if (data.status === 'processing') {
          setStep(4)
        } else if (data.status === 'done') {
          router.push(`/report/${contractId}`)
        } else if (data.status === 'error') {
          setStep(5)
        }
      } catch (error) {
        console.error('Status check error:', error)
      }
    }

    // Initial check
    checkStatus()

    // Poll every 2 seconds
    const interval = setInterval(checkStatus, 2000)

    return () => clearInterval(interval)
  }, [contractId, step, router])

  // After successful upload
  async function afterUpload(id: number) {
    setContractId(id)
    
    if (!isPaymentEnabled) {
      // Тестовый режим - без оплаты
      setStep(3)
      setTimeout(() => {
        startAnalysis(id)
      }, 1000)
      return
    }

    // Показываем выбор способа оплаты
    setShowPaymentChoice(true)
  }

  async function handlePaymentChoice(method: 'balance' | 'direct') {
    setPaymentMethod(method)
    setShowPaymentChoice(false)

    if (method === 'balance') {
      // Проверяем баланс
      if (userBalance < 199) {
        alert('Недостаточно средств на балансе. Пополните кошелек или оплатите картой.')
        setShowPaymentChoice(true)
        return
      }

      // Оплата с баланса
      try {
        const res = await fetch('/api/contracts/pay-from-balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractId })
        })

        if (res.ok) {
          const data = await res.json()
          // Обновляем баланс локально
          setUserBalance(data.newBalance)
          setStep(3)
          startAnalysis(contractId!)
        } else {
          const error = await res.json()
          alert(error.message || 'Ошибка при оплате с баланса')
          setShowPaymentChoice(true)
        }
      } catch (error) {
        console.error('Payment error:', error)
        alert('Произошла ошибка при оплате')
        setShowPaymentChoice(true)
      }
    } else {
      // Прямая оплата картой
      setStep(2)
      setTimeout(() => {
        router.push(`/payment?contractId=${contractId}`)
      }, 1000)
    }
  }

  async function startAnalysis(id: number) {
    try {
      const res = await fetch('/api/contracts/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId: id })
      })

      if (!res.ok) {
        throw new Error('Analysis failed')
      }
    } catch (error) {
      console.error('Analysis error:', error)
      setStep(5)
    }
  }

  // Check if returning from payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const fromPayment = urlParams.get('fromPayment')
    const paidContractId = urlParams.get('contractId')
    
    if (fromPayment === 'true' && paidContractId) {
      const id = parseInt(paidContractId)
      setContractId(id)
      setStep(3)
      
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      startAnalysis(id)
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005bff] mx-auto mb-4"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* CTA Banner - улучшенная мобильная версия */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-4 sm:py-6">
        <div className="rounded-xl bg-gradient-to-r from-[#005bff] via-[#005bff] to-[#090089] text-white py-8 sm:py-10 md:py-14 px-4 sm:px-6 text-center space-y-3 sm:space-y-4">
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-semibold">
            Проверить документ онлайн {isPaymentEnabled ? 'за 199 руб.' : 'бесплатно'}
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg opacity-90">
            Загрузите документ — и через 60 секунд получите детальный анализ рисков
            и рекомендации от нашего AI-ЮРИСТА
          </p>
          {!isPaymentEnabled && (
            <p className="text-xs sm:text-sm opacity-75">
              🎉 Тестовый режим: анализ без оплаты
            </p>
          )}
        </div>
      </section>

      {/* Main content - улучшенная сетка */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left column - Wallet - на мобильных показываем сверху в свернутом виде */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <WalletBalance />
            
            {/* Quick actions */}
            <Card className="mt-4">
              <CardContent className="p-3 sm:p-4">
                <h3 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Быстрые действия</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-sm"
                    onClick={() => router.push('/wallet/topup')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Пополнить кошелек
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-sm"
                    onClick={() => router.push('/wallet/history')}
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    История операций
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column - Upload and process */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {/* Stepper - улучшен для мобильных */}
            <div className="mb-6 sm:mb-8">
              <Stepper steps={[
                { id: 1, name: 'Загрузка', status: step > 1 ? 'complete' : step === 1 ? 'current' : 'upcoming' },
                { id: 2, name: 'Оплата', status: step > 2 ? 'complete' : step === 2 ? 'current' : 'upcoming' },
                { id: 3, name: 'Анализ', status: step > 3 ? 'complete' : step === 3 ? 'current' : 'upcoming' },
                { id: 4, name: 'Готово', status: step === 4 ? 'current' : step > 4 ? 'complete' : 'upcoming' }
              ]} />
            </div>

            {step === 1 && !showPaymentChoice && (
              <div>
                <UnifiedUploadForm onStepComplete={afterUpload} />
              </div>
            )}

            {/* Выбор способа оплаты - улучшен для мобильных */}
            {showPaymentChoice && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Выберите способ оплаты</h2>
                  <div className="space-y-3 sm:space-y-4">
                    {/* Оплата с баланса */}
                    <button
                      onClick={() => handlePaymentChoice('balance')}
                      className={`w-full p-3 sm:p-4 border-2 rounded-lg hover:border-[#005bff] transition-colors text-left ${
                        userBalance < 199 ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      disabled={userBalance < 199}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-[#005bff] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base">Оплатить с кошелька</p>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">
                              Баланс: {new Intl.NumberFormat('ru-RU', {
                                style: 'currency',
                                currency: 'RUB',
                                minimumFractionDigits: 0
                              }).format(userBalance)}
                            </p>
                          </div>
                        </div>
                        <span className="text-base sm:text-lg font-semibold flex-shrink-0">199 ₽</span>
                      </div>
                      {userBalance < 199 && (
                        <p className="text-xs sm:text-sm text-red-600 mt-2">Недостаточно средств</p>
                      )}
                    </button>

                    {/* Прямая оплата картой */}
                    <button
                      onClick={() => handlePaymentChoice('direct')}
                      className="w-full p-3 sm:p-4 border-2 rounded-lg hover:border-[#005bff] transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-[#005bff] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base">Оплатить картой</p>
                            <p className="text-xs sm:text-sm text-gray-600">Visa, Mastercard, МИР</p>
                          </div>
                        </div>
                        <span className="text-base sm:text-lg font-semibold flex-shrink-0">199 ₽</span>
                      </div>
                    </button>

                    {/* Пополнить кошелек */}
                    {userBalance < 199 && (
                      <Button
                        variant="outline"
                        className="w-full text-sm"
                        onClick={() => router.push('/wallet/topup')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Пополнить кошелек
                      </Button>
                    )}
                  </div>

                  {userBalance >= 199 && (
                    <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs sm:text-sm text-blue-900 flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                        <span>После оплаты с кошелька останется {new Intl.NumberFormat('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                          minimumFractionDigits: 0
                        }).format(userBalance - 199)}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <div className="text-center py-12 sm:py-20">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mb-4 bg-blue-100 rounded-full">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="font-heading text-xl sm:text-2xl mb-3 sm:mb-4">Переход к оплате</h2>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  Для запуска анализа необходимо оплатить услугу
                </p>
                <div className="animate-pulse">
                  <p className="text-xs sm:text-sm text-gray-500">Перенаправление на страницу оплаты...</p>
                </div>
              </div>
            )}

            {(step === 3 || step === 4) && (
              <div className="text-center py-12 sm:py-20">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mb-4">
                  <div className="animate-spin rounded-full h-14 w-14 sm:h-16 sm:w-16 border-b-2 border-[#005bff]"></div>
                </div>
                <h2 className="font-heading text-xl sm:text-2xl mb-3 sm:mb-4">
                  Идёт анализ договора
                </h2>
                <p className="text-base sm:text-lg text-gray-600">
                  Это займёт ≈ 1 минуту…
                </p>
                <div className="mt-4 sm:mt-6 max-w-md mx-auto">
                  <div className="text-xs sm:text-sm text-gray-500 text-left space-y-2">
                    <p className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      Файл загружен и проверен
                    </p>
                    {isPaymentEnabled && (
                      <p className="flex items-center text-green-600">
                        <span className="mr-2">✓</span>
                        Оплата подтверждена {paymentMethod === 'balance' && '(с кошелька)'}
                      </p>
                    )}
                    <p className={`flex items-center ${step >= 4 ? 'text-green-600' : ''}`}>
                      <span className="mr-2">{step >= 4 ? '✓' : '⏳'}</span>
                      AI анализирует содержимое
                    </p>
                    <p className="flex items-center text-gray-400">
                      <span className="mr-2">⏳</span>
                      Формирование отчёта
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="text-center space-y-4 py-12 sm:py-20">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mb-4 bg-red-100 rounded-full">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="font-heading text-xl sm:text-2xl">Произошла ошибка</h2>
                <p className="text-sm sm:text-base text-gray-600 px-4">
                  К сожалению, при анализе документа произошла ошибка. 
                  Пожалуйста, попробуйте еще раз.
                </p>
                <button
                  onClick={() => {
                    setStep(1)
                    setContractId(null)
                    setShowPaymentChoice(false)
                  }}
                  className="inline-block bg-[#005bff] hover:bg-[#0048cc] text-white px-5 sm:px-6 py-2 rounded-lg transition-colors text-sm sm:text-base"
                >
                  Попробовать снова
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it works section - улучшен для мобильных */}
      <section id="how" className="mx-auto max-w-6xl py-12 sm:py-16 md:py-20 px-4 sm:px-6 text-center space-y-6 sm:space-y-8 md:space-y-10">
        <h2 className="font-heading text-2xl sm:text-3xl font-semibold">Как это работает?</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 md:gap-10">
          {[
            { icon: '⬆', title: 'Загрузите договор и укажите роль', desc: 'Прикрепите DOCX или PDF' },
            { icon: '⚙️', title: 'AI анализирует документ', desc: 'Наш юридический ИИ находит риски за 1 минуту' },
            { icon: '✅', title: 'Получите детальный отчёт', desc: 'Рекомендации и ссылки на проблемные места' },
          ].map((item, i) => (
            <div key={i} className="space-y-2 sm:space-y-3">
              <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-full bg-green-100 text-xl sm:text-2xl">
                {item.icon}
              </div>
              <h3 className="font-semibold text-sm sm:text-base">{item.title}</h3>
              <p className="text-xs sm:text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}