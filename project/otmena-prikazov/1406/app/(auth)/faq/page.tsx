// app/(auth)/faq/page.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle, MessageCircle, FileText, CreditCard, Shield, Zap, Users, Mail, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

interface FAQItem {
  question: string
  answer: string | React.ReactNode
  category: 'general' | 'technical' | 'payment' | 'security'
}

const faqData: FAQItem[] = [
  // Общие вопросы
  {
    category: 'general',
    question: 'Что такое imYrist?',
    answer: '🤖 imYrist — это онлайн-сервис, который помогает быстро и просто проверить любой документ на юридические риски с помощью AI-технологий. Вам не нужно быть юристом, чтобы понять, насколько безопасен документ: достаточно загрузить файл — и уже в течение 60 секунд Вы получите понятный отчёт с выявленными проблемами, распределёнными по зонам риска.'
  },
  {
    category: 'general',
    question: 'Как быстро происходит анализ?',
    answer: 'Анализ документа занимает не более 60 секунд. После загрузки файла и оплаты система мгновенно приступает к работе, и вы получаете полный отчет с рекомендациями.'
  },
  {
    category: 'general',
    question: 'Заменяет ли сервис консультацию юриста?',
    answer: 'Нет, AI-анализ договоров не заменяет консультацию юриста. Сервис носит информационно-рекомендательный характер и помогает выявить потенциальные риски, которые затем можно обсудить с квалифицированным специалистом.'
  },
  
  // Технические вопросы
  {
    category: 'technical',
    question: 'Какие форматы документов поддерживаются?',
    answer: (
      <div>
        <p>Сервис поддерживает следующие форматы:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>PDF</strong> (с текстом, не скан!)</li>
          <li><strong>DOCX</strong> (Microsoft Word)</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">
          💡 При наличии файла в другом формате воспользуйтесь сторонним конвертером, например — convertio.co
        </p>
      </div>
    )
  },
  {
    category: 'technical',
    question: 'Насколько точен анализ ИИ?',
    answer: 'Мы используем специализированную LLM-модель, обученную на юридических данных. По типовым договорам точность выявления рисков составляет около 95%. Система постоянно совершенствуется и обновляется.'
  },
  {
    category: 'technical',
    question: 'Какой максимальный размер файла?',
    answer: 'Максимальный размер загружаемого файла — 10 МБ. Этого достаточно для анализа большинства договоров и юридических документов.'
  },
  {
    category: 'technical',
    question: 'Можно ли загрузить сканированный документ?',
    answer: 'Нет, система работает только с текстовыми документами. Сканированные изображения или PDF без распознанного текста не подойдут. Перед загрузкой убедитесь, что в PDF можно выделить и скопировать текст.'
  },
  
  // Оплата и тарифы
  {
    category: 'payment',
    question: 'Сколько стоит анализ одного документа?',
    answer: 'Стоимость анализа одного документа — 199 рублей. Оплата производится за каждый загруженный и проанализированный документ.'
  },
  {
    category: 'payment',
    question: 'Какие способы оплаты доступны?',
    answer: (
      <div>
        <p>Доступны следующие способы оплаты:</p>
        <ul className="list-disc pl-5 mt-2 space-y-2">
          <li><strong>Оплата с внутреннего кошелька</strong> — мгновенная оплата с вашего баланса</li>
          <li><strong>Оплата картой</strong> — Visa, Mastercard, МИР через TPay</li>
          <li><strong>SBERPay</strong> — оплата через приложение Сбербанка</li>
          <li><strong>Безналичный расчет</strong> — для юридических лиц по счету</li>
        </ul>
      </div>
    )
  },
  {
    category: 'payment',
    question: 'Какие преимущества у внутреннего кошелька?',
    answer: (
      <div>
        <ul className="list-disc pl-5 space-y-2">
          <li>Бонусы до 15% от суммы пополнения</li>
          <li>Мгновенная оплата без ожидания</li>
          <li>Несгораемые средства на балансе</li>
          <li>История всех операций в личном кабинете</li>
        </ul>
      </div>
    )
  },
  {
    category: 'payment',
    question: 'Могу ли я получить счет на компанию?',
    answer: 'Да, мы работаем с юридическими лицами. Напишите нам через форму обратной связи или на info@imyrist.ru — выставим счет и проведём безналичный платёж.'
  },
  {
    category: 'payment',
    question: 'Есть ли возврат средств?',
    answer: 'Возврат средств возможен в случае технической ошибки сервиса, когда анализ не был выполнен. Если вы получили отчет - то услуга считается исполненной.'
  },
  
  // Безопасность и конфиденциальность
  {
    category: 'security',
    question: 'Сохраняются ли мои документы?',
    answer: 'Мы сохраняем только историю наших рекомендаций к вашим договорам для вашего удобства. Сами документы автоматически удаляются через 30 дней после загрузки. Вы также можете удалить их вручную в любой момент.'
  },
  {
    category: 'security',
    question: 'Насколько безопасны мои данные?',
    answer: 'Мы используем современные методы шифрования для защиты ваших данных. Все передаваемые документы шифруются по протоколу SSL. Доступ к документам имеете только вы через личный кабинет.'
  },
  {
    category: 'security',
    question: 'Кто имеет доступ к моим документам?',
    answer: 'Доступ к вашим документам и отчетам имеете только вы. Наши сотрудники не имеют доступа к содержимому загруженных файлов. AI-система обрабатывает документы автоматически без участия человека.'
  }
]

const categories = [
  { id: 'technical', name: 'Технические вопросы', icon: FileText },
  { id: 'payment', name: 'Оплата и тарифы', icon: CreditCard },
  { id: 'security', name: 'Безопасность', icon: Shield }
]

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<number[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showInstruction, setShowInstruction] = useState(false)

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const filteredFAQ = selectedCategory === 'all' 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-4">Часто задаваемые вопросы</h1>
        <p className="text-gray-600 mb-6">
          Здесь вы найдете ответы на популярные вопросы о сервисе imYrist
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button 
            onClick={() => setShowInstruction(!showInstruction)}
            variant={showInstruction ? "default" : "outline"}
            className={showInstruction ? "bg-[#005bff] hover:bg-[#0048cc]" : ""}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            {showInstruction ? 'Скрыть инструкцию' : 'Пошаговая инструкция'}
          </Button>
          
          <Link href="https://t.me/imYrist_bot" target="_blank">
            <Button className="bg-[#005bff] hover:bg-[#0048cc]">
              <MessageCircle className="h-4 w-4 mr-2" />
              Написать в поддержку
            </Button>
          </Link>
        </div>
      </div>

      {/* Step by Step Instruction */}
      {showInstruction && (
        <Card className="mb-10 border-2 border-[#005bff]/20">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">Пошаговая инструкция</h2>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 mb-6">
                🤖 <strong>imYrist</strong> — это онлайн-сервис, который помогает быстро и просто проверить любой документ на юридические риски с помощью AI-технологий. 
                Вам не нужно быть юристом, чтобы понять, насколько безопасен документ: достаточно загрузить файл — и уже в течение 60 секунд 
                Вы получите понятный отчёт с выявленными проблемами, распределёнными по зонам риска. 
                В этой инструкции мы пошагово расскажем, как быстро воспользоваться сервисом!
              </p>

              {/* Шаг 1 */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-[#005bff]">Шаг 1. Регистрация на платформе</h3>
                <p className="mb-4">
                  Оказавшись на сайте imYrist, нажмите <strong>«Войти»</strong> → <strong>«Зарегистрироваться»</strong>, 
                  если ещё не успели зарегистрироваться.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <Image 
                      src="/faq1.png" 
                      alt="Кнопка входа" 
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <Image 
                      src="/faq2.png" 
                      alt="Форма регистрации" 
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <p>
                  Необходимо указать адрес электронной почты, придумать пароль минимум из 6 символов, 
                  продублировать пароль и принять условия пользовательского соглашения.
                </p>
              </div>

              {/* Шаг 2 */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-[#005bff]">Шаг 2. Загрузка документа</h3>
                <p className="mb-4">Убедитесь, что у Вас есть файл в одном из форматов ❗❗❗</p>
                <ul className="list-disc pl-6 mb-4">
                  <li><strong>PDF</strong> (с текстом, не скан!)</li>
                  <li><strong>DOCX</strong> (Microsoft Word)</li>
                </ul>
                <p className="text-sm text-gray-600 mb-4">
                  💡 При наличии файла в другом разрешении перед загрузкой воспользуйтесь сторонним конвертером, 
                  например — convertio.co
                </p>
                <p className="mb-4">
                  Файл должен содержать полный текст документа, который Вы хотите проверить.
                </p>
                <p className="mb-2">Для более точного анализа:</p>
                <ol className="list-decimal pl-6 mb-4">
                  <li>Укажите описание деятельности Вашей компании</li>
                  <li>Из выпадающего списка выберите Вашу роль в договоре</li>
                </ol>
                <p className="mb-4">И загрузите сам файл в поле <strong>«Файл договора»</strong>.</p>
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <Image 
                    src="/faq3.png" 
                    alt="Форма загрузки документа" 
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Шаг 3 */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-[#005bff]">Шаг 3. Оплата</h3>
                <p className="mb-4">После загрузки документа выберите удобный способ оплаты:</p>
                
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">• Оплата с внутреннего кошелька</h4>
                  <p className="mb-3">
                    Если у Вас на балансе достаточно средств, просто нажмите <strong>«Оплатить с кошелька»</strong>. 
                    Сумма (199 ₽) спишется автоматически, и Вы перейдёте к следующему этапу анализа.
                  </p>
                  <p className="mb-3">
                    Оплачивая с внутреннего кошелька, Вы получаете бонусы в размере до 15% от суммы пополнения, 
                    анализ документов без ожидания платежа, несгораемые средства, хранящиеся на Вашем балансе.
                  </p>
                  <p className="mb-3">
                    Чтобы пополнить кошелёк, нажмите <strong>«Пополнить кошелёк»</strong>, выберите сумму пополнения 
                    или введите свою от 100 ₽ до 50 000 ₽, и нажмите в правой панели <strong>«Оплатить картой ... ₽»</strong>.
                  </p>
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                    <Image 
                      src="/faq4.png" 
                      alt="Пополнение кошелька" 
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    💡 Для оплаты по безналичному расчёту от юридического лица, нажмите <strong>«Оплатить от организации»</strong> 
                    и следуйте инструкции.
                  </p>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold mb-2">• Оплата картой</h4>
                  <p className="mb-3">
                    Если баланс кошелька пустой или вы предпочитаете оплату напрямую, выберите <strong>«Оплатить картой»</strong> — 
                    доступны TPay, SBERPay и карты Visa, Mastercard, МИР — введите данные карты и подтвердите платёж.
                  </p>
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                    <Image 
                      src="/faq5.png" 
                      alt="Оплата картой" 
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    💡 После оплаты вы сразу попадёте на страницу анализа, где начнётся обработка Вашего документа.
                  </p>
                </div>
              </div>

              {/* Шаг 4 */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-[#005bff]">Шаг 4. Результаты анализа</h3>
                <p className="mb-4">
                  После оплаты система мгновенно приступит к анализу документа, обычно это занимает не более 60 секунд — 
                  после чего появится подробный отчёт, в котором Вы увидите:
                </p>
                <ul className="list-disc pl-6 mb-4">
                  <li className="mb-2">
                    <strong>Общее заключение</strong> — краткий обзор сути документа и его юридической значимости.
                  </li>
                  <li className="mb-2">
                    <strong>Риски</strong> — разбитые по уровням важности:
                    <div className="mt-2 space-y-1">
                      <p>🔴 <strong>Критические</strong> — требуют безотлагательных мер и максимального внимания;</p>
                      <p>🟡 <strong>Умеренные</strong> — значимы, нуждаются в плановом изменении и регулярном контроле;</p>
                      <p>🟢 <strong>Низкие</strong> — допускают изменения по усмотрению, без срочности.</p>
                    </div>
                  </li>
                </ul>
                <p className="mb-4">
                  💡 Также Вы сможете нажать <strong>«Скачать PDF»</strong> и скачать полный отчёт в формате PDF 
                  для дальнейшего использования или передачи юристу.
                </p>
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <Image 
                    src="/faq6.png" 
                    alt="Результаты анализа" 
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            selectedCategory === 'all'
              ? 'bg-[#005bff] text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          Все вопросы
        </button>
        {categories.map(category => {
          const Icon = category.icon
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                selectedCategory === category.id
                  ? 'bg-[#005bff] text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {category.name}
            </button>
          )
        })}
      </div>

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredFAQ.map((item, index) => (
          <Card key={index} className="overflow-hidden">
            <button
              onClick={() => toggleItem(index)}
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium pr-4">{item.question}</h3>
                {openItems.includes(index) ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </div>
            </button>
            {openItems.includes(index) && (
              <CardContent className="pt-0 pb-4 px-4">
                <div className="text-gray-600">
                  {typeof item.answer === 'string' ? (
                    <p>{item.answer}</p>
                  ) : (
                    item.answer
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Quick Start Guide */}
      <Card className="mt-12 bg-blue-50">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#005bff]" />
            Быстрый старт
          </h2>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-[#005bff] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Зарегистрируйтесь или войдите</p>
                <p className="text-sm text-gray-600">Создайте аккаунт за 30 секунд</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-[#005bff] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">Загрузите документ</p>
                <p className="text-sm text-gray-600">PDF или DOCX, укажите вашу роль в договоре</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-[#005bff] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Оплатите анализ</p>
                <p className="text-sm text-gray-600">199 ₽ с кошелька или картой</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-[#005bff] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                4
              </div>
              <div>
                <p className="font-medium">Получите отчет</p>
                <p className="text-sm text-gray-600">Через 60 секунд — подробный анализ рисков</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Section */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#005bff]" />
            Остались вопросы?
          </h2>
          <p className="text-gray-600 mb-4">
            Если вы не нашли ответ на свой вопрос, свяжитесь с нами удобным способом:
          </p>
          <div className="space-y-3">
            <Link 
              href="https://t.me/imYrist_bot" 
              target="_blank"
              className="flex items-center gap-3 text-[#005bff] hover:underline"
            >
              <MessageCircle className="h-5 w-5" />
              Telegram-бот поддержки
            </Link>
            <Link 
              href="mailto:info@imyrist.ru"
              className="flex items-center gap-3 text-[#005bff] hover:underline"
            >
              <Mail className="h-5 w-5" />
              info@imyrist.ru
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}