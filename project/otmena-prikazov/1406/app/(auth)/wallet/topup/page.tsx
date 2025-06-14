// app/(auth)/wallet/topup/page.tsx 
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  Wallet,
  ArrowLeft,
  Info,
  Sparkles,
  Gift,
  TrendingUp,
  Building
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PromoCodeForm from '@/components/wallet/PromoCodeForm'

const PRESET_AMOUNTS = [
  { value: 500, bonus: 0, popular: false },
  { value: 1000, bonus: 0, popular: false },
  { value: 2000, bonus: 100, popular: true },
  { value: 5000, bonus: 500, popular: false },
  { value: 10000, bonus: 1500, popular: false },
  { value: 15000, bonus: 2250, popular: false },
]

export default function TopUpPage() {
  const router = useRouter()
  const [amount, setAmount] = useState(2000)
  const [customAmount, setCustomAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(0)
  const [showInvoiceInfo, setShowInvoiceInfo] = useState(false)

  useEffect(() => {
    fetchBalance()
  }, [])

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/balance')
      if (res.ok) {
        const data = await res.json()
        setCurrentBalance(data.balance)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const getBonus = (value: number) => {
    if (value >= 10000) return Math.floor(value * 0.15)
    if (value >= 5000) return Math.floor(value * 0.10)
    if (value >= 2000) return Math.floor(value * 0.05)
    return 0
  }

  const handleAmountSelect = (value: number) => {
    setAmount(value)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setCustomAmount(value)
    if (value) {
      setAmount(parseInt(value))
    }
  }

  const handleTopUp = async () => {
    if (amount < 100) {
      alert('Минимальная сумма пополнения - 100 ₽')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      })

      const data = await response.json()

      if (data.success) {
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl
        } else if (data.testMode) {
          alert(`Баланс пополнен на ${amount} ₽ (тестовый режим)`)
          router.push('/wallet/history')
        }
      } else {
        alert(data.error || 'Ошибка при создании платежа')
      }
    } catch (error) {
      console.error('Top up error:', error)
      alert('Произошла ошибка')
    } finally {
      setIsProcessing(false)
    }
  }

  const totalAmount = amount + getBonus(amount)

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
      <div className="flex items-center mb-4 sm:mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mr-2 sm:mr-4 p-2 sm:p-2"
        >
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Назад</span>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold">Пополнение кошелька</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
        {/* Левая колонка - выбор суммы */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">
          {/* Текущий баланс */}
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Текущий баланс</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0
                    }).format(currentBalance)}
                  </p>
                </div>
                <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          {/* Промокод */}
          <PromoCodeForm 
            onSuccess={(result) => {
              if (result.type === 'credit' && result.newBalance) {
                setCurrentBalance(result.newBalance)
                fetchBalance()
              }
            }}
          />

          {/* Выбор суммы */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Выберите сумму пополнения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {/* Предустановленные суммы */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleAmountSelect(preset.value)}
                    className={`relative p-3 sm:p-4 rounded-lg border-2 transition-all ${
                      amount === preset.value && !customAmount
                        ? 'border-[#005bff] bg-[#005bff]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {preset.popular && (
                      <Badge className="absolute -top-2 -right-2 bg-orange-500 text-xs px-1 py-0.5">
                        Популярно
                      </Badge>
                    )}
                    <div className="font-semibold text-sm sm:text-lg">
                      {preset.value.toLocaleString()} ₽
                    </div>
                    {preset.bonus > 0 && (
                      <div className="text-xs text-green-600 mt-0.5 sm:mt-1">
                        +{preset.bonus} ₽ бонус
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Своя сумма */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">
                  Или введите свою сумму
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="Например: 3000"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border rounded-lg focus:ring-2 focus:ring-[#005bff] focus:border-transparent text-sm sm:text-base"
                  />
                  <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm sm:text-base">
                    ₽
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Минимум 100 ₽, максимум 50 000 ₽
                </p>
              </div>

              {/* Бонусы */}
              {amount >= 2000 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 sm:p-4 border border-green-200">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-green-900 text-sm sm:text-base">
                        Бонус за пополнение: +{getBonus(amount)} ₽
                      </p>
                      <p className="text-xs sm:text-sm text-green-700">
                        {amount >= 10000 && 'Максимальный бонус 15%!'}
                        {amount >= 5000 && amount < 10000 && 'Бонус 10% к сумме пополнения'}
                        {amount >= 2000 && amount < 5000 && 'Бонус 5% к сумме пополнения'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Преимущества - скрываем на мобильных */}
          <Card className="hidden sm:block">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-[#e7cb05]" />
                Преимущества пополнения кошелька
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Бонусы до 15%</p>
                    <p className="text-sm text-gray-600">
                      Чем больше сумма, тем выше бонус
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Мгновенная оплата</p>
                    <p className="text-sm text-gray-600">
                      Анализируйте документы без ожидания платежа
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Wallet className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Средства не сгорают</p>
                    <p className="text-sm text-gray-600">
                      Используйте баланс когда удобно
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Правая колонка - итого */}
        <div className="md:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">Детали платежа</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Сумма пополнения</span>
                  <span className="font-medium whitespace-nowrap">
                    {amount.toLocaleString()}&nbsp;₽
                  </span>
                </div>
                {getBonus(amount) > 0 && (
                  <div className="flex justify-between text-green-600 text-sm sm:text-base">
                    <span>Бонус</span>
                    <span className="font-medium whitespace-nowrap">
                      +{getBonus(amount).toLocaleString()}&nbsp;₽
                    </span>
                  </div>
                )}
                <div className="border-t pt-2 sm:pt-3">
                  <div className="flex justify-between text-base sm:text-lg font-semibold">
                    <span>Будет начислено</span>
                    <span className="text-[#005bff] whitespace-nowrap">
                      {totalAmount.toLocaleString()}&nbsp;₽
                    </span>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  <p>После пополнения: {(currentBalance + totalAmount).toLocaleString()} ₽</p>
                  <p className="mt-1">
                    Хватит на {Math.floor((currentBalance + totalAmount) / 199)} анализов
                  </p>
                </div>
              </div>

              <Button
                onClick={handleTopUp}
                disabled={isProcessing || amount < 100}
                className="w-full text-sm sm:text-base min-h-[44px] px-3"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2 flex-shrink-0" />
                    <span className="truncate">Обработка...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                    <span className="truncate">
                      Оплатить картой {amount.toLocaleString()}&nbsp;₽
                    </span>
                  </>
                )}
              </Button>

              <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-gray-600">
                    <p className="font-medium mb-0.5 sm:mb-1">Безопасная оплата</p>
                    <p>Платеж обрабатывается через защищенную систему Т-Банк</p>
                  </div>
                </div>
              </div>

              {/* Кнопка оплаты по безналу */}
              <div className="pt-3 sm:pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowInvoiceInfo(true)}
                  className="w-full text-xs sm:text-sm"
                >
                  <Building className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Оплатить от организации
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Модальное окно с информацией о безналичной оплате */}
      {showInvoiceInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Building className="h-4 w-4 sm:h-5 sm:w-5" />
                Оплата по безналу
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base text-gray-600">
                Для оплаты по безналичному расчету от юридического лица отправьте запрос на выставление счета.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-1 sm:space-y-2">
                <p className="font-medium text-sm sm:text-base">Отправьте на email:</p>
                <a 
                  href="mailto:info@imyrist.ru?subject=Запрос счета на пополнение баланса" 
                  className="text-[#005bff] hover:underline font-medium text-sm sm:text-base"
                >
                  info@imyrist.ru
                </a>
              </div>

              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
                <p className="font-medium">В письме укажите:</p>
                <ul className="list-disc list-inside space-y-0.5 sm:space-y-1 ml-2">
                  <li>Реквизиты организации</li>
                  <li>ИНН и КПП</li>
                  <li>Сумму пополнения: {amount.toLocaleString()} ₽</li>
                  <li>Email аккаунта для зачисления средств</li>
                </ul>
              </div>

              <p className="text-xs sm:text-sm text-gray-600">
                Счет будет выставлен в течение 1 рабочего дня. После оплаты средства 
                поступят на ваш баланс в течение 1-2 рабочих дней.
              </p>

              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowInvoiceInfo(false)}
                  className="flex-1 text-xs sm:text-sm"
                >
                  Закрыть
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText('info@imyrist.ru')
                      alert('Email скопирован в буфер обмена!')
                    } catch (err) {
                      const textArea = document.createElement('textarea')
                      textArea.value = 'info@imyrist.ru'
                      textArea.style.position = 'fixed'
                      textArea.style.top = '0'
                      textArea.style.left = '0'
                      textArea.style.width = '2em'
                      textArea.style.height = '2em'
                      textArea.style.padding = '0'
                      textArea.style.border = 'none'
                      textArea.style.outline = 'none'
                      textArea.style.boxShadow = 'none'
                      textArea.style.background = 'transparent'
                      document.body.appendChild(textArea)
                      textArea.focus()
                      textArea.select()
                      try {
                        document.execCommand('copy')
                        alert('Email скопирован в буфер обмена!')
                      } catch (err) {
                        alert('Не удалось скопировать. Email: info@imyrist.ru')
                      }
                      document.body.removeChild(textArea)
                    }
                  }}
                  className="flex-1 text-xs sm:text-sm"
                >
                  Скопировать почту
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}