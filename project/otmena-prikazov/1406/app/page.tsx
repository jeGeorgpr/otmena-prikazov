// app/page.tsx — исправленная версия лендинга

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Unbounded, Montserrat } from "next/font/google"
import Footer from '@/components/layout/Footer'
import Link from "next/link"
import Image from "next/image" 
import {
  ChevronRight,
  Upload,
  SearchCheck,
  CheckCircle,
  ShieldAlert,
  AlertTriangle,
  BrainCircuit,
  TrendingUp,
  Building2,
} from "lucide-react"

/* ----------------------------- шрифты ----------------------------- */
const heading = Unbounded({ subsets: ["latin"], variable: "--font-heading", weight: ["400","600","700"] })
const text    = Montserrat({ subsets: ["latin"], variable: "--font-text", weight: ["400","500","600"] })

/* ---------------------------- палитра ----------------------------- */
const primary = "#005bff"
const accent  = "#e7cb05"

/* ------------------------------------------------------------------ */
export default function LandingPage() {
  return (
    <main className={`${heading.variable} ${text.variable} font-text text-gray-900`}>

      {/* ───────────── HEADER ───────────── */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-full px-6">
          <Link href="/" className="font-heading text-lg font-bold text-gray-900">
            imYrist
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-800">
            <a href="#features" className="hover:text-[#e7cb05] transition-colors">Возможности</a>
            <a href="#how" className="hover:text-[#e7cb05] transition-colors">Как это работает</a>
            <a href="#pricing" className="hover:text-[#e7cb05] transition-colors">Тарифы</a>
            <a href="#faq" className="hover:text-[#e7cb05] transition-colors">FAQ</a>
          </nav>

          <Link
            href="/auth/signin"
            className="ml-6 hidden md:inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium bg-[#e7cb05] text-black hover:opacity-90 transition-opacity"
          >
            Войти
          </Link>
        </div>
      </header>

      {/* ───────────── HERO ───────────── */}
      <section className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#005bff] via-[#090089] to-black px-6 pb-24 pt-32 text-white">
        <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-2 lg:gap-24">
          <div className="flex flex-col gap-6">
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              im<span className="text-[#e7cb05]">Yrist</span>
              <br /> AI-проверка договоров
              <br /> за&nbsp;1&nbsp;минуту
            </h1>

            <p className="text-lg/relaxed font-medium max-w-prose">
              Загружаете DOCX или PDF — через минуту получаете отчёт с рисками,
              ссылками и предложениями безопасных формулировок.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/auth/signin">
                <Button
                  size="lg"
                  className="bg-[#e7cb05] text-black hover:opacity-90 transition-opacity"
                >
                  Проверить документ за 199 ₽
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>

              <Link href="#how" className="underline underline-offset-4 hover:text-gray-200 transition-colors">
                Как это работает?
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-white/10 p-6 backdrop-blur-md hidden lg:block">
            <Image
              src="/hero-mock.svg"
              alt="Пример отчёта"
              width={600}
              height={450}
              priority
            />
          </div>
        </div>
      </section>

      {/* ───────────────── Pain ───────────────── */}
      <section className="bg-white py-20 px-6">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="font-heading text-3xl font-semibold">Знакомая боль?</h2>

            <ul className="space-y-4 text-base">
              {[
                "Каждый новый договор заставляет нервничать",
                "Ручная проверка отнимает пол-дня",
                "Штатный юрист = дорого, а фриланс долго",
                "Пропущенные ошибки обходятся в штрафы и суды",
              ].map((p, i) => (
                <li key={i} className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 text-red-600 flex-shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 font-medium">
              Не рискуйте деньгами и репутацией — доверьте проверку{" "}
              <span className="font-heading">imYrist</span>.
            </p>
          </div>

          <Image
            src="/pain-illustration.svg"
            alt="Стресс от договоров"
            width={500}
            height={340}
            className="mx-auto"
          />
        </div>
      </section>

      {/* ───────────────── Features ───────────────── */}
      <section id="features" className="bg-gray-50 py-20 px-6">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-16 items-center">
          <Image
            src="/ai-lawyer.svg"
            alt="AI-анализ"
            width={520}
            height={380}
            className="mx-auto order-2 lg:order-1"
          />

          <div className="space-y-8 order-1 lg:order-2">
            <h2 className="font-heading text-3xl font-semibold flex items-center gap-2">
              <BrainCircuit className="h-8 w-8 text-[#e7cb05]" />
              imYrist — ваш персональный юрист
            </h2>

            <ul className="space-y-6 text-base">
              {[
                {
                  title: "Скрытые ловушки и невыгодные пункты",
                  text: "Система подсвечивает формулировки, которые грозят убытками.",
                },
                {
                  title: "Финансовые и юридические риски",
                  text: "Оцениваем серьёзность последствий и предлагаем решения.",
                },
                {
                  title: "Двусмысленные формулировки",
                  text: "AI предлагает ясные варианты, чтобы избежать споров.",
                },
              ].map((f, i) => (
                <li key={i} className="flex gap-3">
                  <CheckCircle className="mt-1 h-5 w-5 text-[#005bff] flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-semibold">{f.title}</h4>
                    <p className="text-sm text-gray-600">{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-sm text-gray-500">
              В отчёте — ссылки на пункты документа и рекомендации.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────── How it works ───────────────── */}
      <section id="how" className="bg-white py-20 px-6">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="font-heading text-3xl font-semibold mb-12">
            ⚡️ Проверка за 3 шага
          </h2>

          <div className="grid sm:grid-cols-3 gap-10">
            {[
              { icon: Upload, title: "Загрузите документ", text: "DOCX и PDF" },
              { icon: SearchCheck, title: "Анализ 60 секунд", text: "ИИ ищет риски" },
              { icon: CheckCircle, title: "Получите отчёт", text: "и рекомендации" },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-4">
                <s.icon className="h-12 w-12 text-[#e7cb05]" />
                <h4 className="font-heading text-xl font-semibold">{s.title}</h4>
                <p className="max-w-[16ch] text-sm text-gray-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── Benefits ───────────────── */}
      <section id="benefits" className="bg-gray-50 py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-3xl font-semibold text-center mb-12">
            💎 Почему imYrist эффективнее обычного юриста?
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Мгновенная проверка", text: "1 минута вместо часов." },
              { title: "До 95 % точности", text: "Отлавливаем типовые риски." },
              { title: "Готовые рекомендации", text: "Ссылки на законы РФ." },
              { title: "Подстройка под бизнес", text: "Учитываем отраслевые нюансы." },
              { title: "Доступность формата", text: "MS Word docx и PDF." },
              { title: "Шифрование", text: "Полная конфиденциальность." },
            ].map((b, i) => (
              <Card key={i} className="shadow-xl">
                <CardContent className="flex flex-col items-start gap-3 p-6">
                  <CheckCircle className="h-8 w-8 text-[#005bff]" />
                  <h3 className="font-heading text-xl font-semibold">{b.title}</h3>
                  <p>{b.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── Value ───────────────── */}
      <section className="bg-white py-20 px-6">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="font-heading text-3xl font-semibold mb-12">
            Что вы получаете с imYrist?
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Экономия времени", text: "Моментальная проверка освобождает время." },
              { title: "Экономия бюджета", text: "В десятки раз дешевле консультаций." },
              { title: "Защита от рисков", text: "Ошибки не пройдут незамеченными." },
              { title: "Понятность", text: "Рекомендации ясны даже не-юристу." },
            ].map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <CheckCircle className="h-8 w-8 text-[#e7cb05]" />
                <h4 className="font-heading font-semibold">{v.title}</h4>
                <p className="text-sm text-gray-600 max-w-[22ch]">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------- PRICING (обновленные тарифы) ----------------- */}
      <section id="pricing" className="bg-gray-50 py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-heading text-3xl font-semibold text-center mb-12">
            Тарифы
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Базовый тариф */}
            <Card className="border-2 shadow-xl">
              <CardContent className="p-8 flex flex-col gap-6">
                <h3 className="font-heading text-2xl font-semibold">Базовый</h3>

                <ul className="text-sm space-y-2 list-disc list-inside flex-grow">
                  <li>Проверка ключевых рисков</li>
                  <li>Отчёт-рекомендации с ссылками на пункты</li>
                  <li>Шифрование данных • базовая поддержка</li>
                </ul>

                <div className="space-y-2">
                  <div className="text-3xl font-bold">199&nbsp;₽</div>
                  <p className="text-sm text-gray-500">за 1 проверку</p>
                </div>

                <Link href="/auth/signin" className="w-full">
                  <Button className="w-full bg-[#005bff] hover:bg-[#0047cc] text-white">
                    Выбрать
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Пополнение с бонусом */}
            <Card className="border-2 shadow-xl relative border-[#e7cb05]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[#e7cb05] text-black px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Популярно
                </span>
              </div>
              <CardContent className="p-8 flex flex-col gap-6">
                <h3 className="font-heading text-2xl font-semibold">Пополнение</h3>

                <ul className="text-sm space-y-2 list-disc list-inside flex-grow">
                  <li>Все возможности базового тарифа</li>
                  <li><strong>Бонус за пополнение: +5%</strong></li>
                  <li>Удобно для регулярных проверок</li>
                </ul>

                <div className="space-y-2">
                  <div className="text-3xl font-bold">2000&nbsp;₽</div>
                  <p className="text-sm text-gray-500">единоразовое пополнение</p>
                </div>

                <Link href="/auth/signin" className="w-full">
                  <Button className="w-full bg-[#e7cb05] hover:bg-[#d4b805] text-black">
                    Выбрать
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Корпоративный тариф */}
            <Card className="border-2 shadow-xl">
              <CardContent className="p-8 flex flex-col gap-6">
                <h3 className="font-heading text-2xl font-semibold flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  Корпоративный
                </h3>

                <ul className="text-sm space-y-2 list-disc list-inside flex-grow">
                  <li>Индивидуальные условия</li>
                  <li>Приоритетная поддержка</li>
                  <li>API для интеграции</li>
                  <li>Безлимитные проверки</li>
                </ul>

                <div className="space-y-2">
                  <div className="text-2xl font-bold">По запросу</div>
                  <p className="text-sm text-gray-500">свяжитесь с нами</p>
                </div>

                <Link href="https://t.me/imYrist_bot" target="_blank" className="w-full">
                  <Button className="w-full" variant="outline">
                    Связаться
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            ✅ Без подписок и скрытых платежей
          </p>
        </div>
      </section>

      {/* ───────────────── Common Mistakes ───────────────── */}
      <section className="bg-white py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-heading text-3xl font-semibold text-center mb-12">
            9 подводных камней в договорах, которые часто пропускают
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Скрытые штрафы в приложениях",
                text: "Нередко прячутся в дополнениях или приложениях мелким текстом. Влекут за собой неожиданные финансовые потери."
              },
              {
                title: "Расплывчатые временные рамки",
                text: "Фразы типа «в кратчайшие сроки» или «по мере возможности» открывают лазейки для неисполнения договорённостей."
              },
              {
                title: "Ущемление ваших возможностей",
                text: "Однобокие положения, урезающие ваши полномочия без равноценных гарантий от контрагента."
              },
              {
                title: "Неоднозначные понятия",
                text: "Размытые формулировки базовых определений ведут к противоположной интерпретации договорённостей участниками."
              },
              {
                title: "Нет механизма выхода",
                text: "Отсутствие ясных пунктов о прекращении договора может заблокировать вас в невыгодных условиях надолго."
              },
              {
                title: "Автоматическое продление без уведомления",
                text: "Договор автоматически пролонгируется на новый срок, если вы не успели отказаться за 30-60 дней до окончания. Легко пропустить дедлайн и застрять еще на год."
              },
              {
                title: "Скрытая передача прав на результаты",
                text: "Незаметные формулировки о переходе исключительных прав на вашу интеллектуальную собственность, разработки или ноу-хау к контрагенту."
              },
              {
                title: "Односторонние изменения условий",
                text: "Право контрагента менять условия договора в одностороннем порядке «по уведомлению», что может кардинально изменить ваши обязательства."
              },
              {
                title: "Неограниченная ответственность",
                text: "Отсутствие лимитов по возмещению убытков или формулировки об ответственности «в полном объеме» могут привести к разорительным искам."
              }
            ].map((mistake, i) => (
              <Card key={i} className="shadow-lg">
                <CardContent className="p-6">
                  <ShieldAlert className="h-8 w-8 text-red-500 mb-3" />
                  <h3 className="font-heading text-lg font-semibold mb-2">{mistake.title}</h3>
                  <p className="text-sm text-gray-600">{mistake.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-xl font-heading font-semibold mb-4">
              Проверьте свой договор и спите спокойно
            </p>
            <Link href="/auth/signin">
              <Button size="lg" className="bg-[#005bff] hover:bg-[#0047cc] text-white">
                Начать проверку
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>


      {/* -----------------------------  FAQ  ----------------------------- */}
      <section id="faq" className="bg-gray-50 py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-heading text-3xl font-semibold text-center mb-12">
            FAQ
          </h2>

          <div className="space-y-4">
            {[
              ['Какие форматы документов поддерживаются?',
               'DOCX и PDF (текстовый).'],
              ['Насколько точен анализ ИИ?',
               'Мы используем специализированную LLM-модель, обученную на юридических данных. По типовым договорам точность выявления рисков — около 95 %.'],
              ['Сохраняются ли мои файлы?',
               'Сохраняется именно история наших рекомендаций к вашим договорам.'],
              ['Могу ли я получить счёт на компанию?',
               'Да, напишите нам через форму обратной связи — выставим счёт и проведём безналичный платёж.']
            ].map(([question, answer]) => (
              <details
                key={question}
                className="group rounded-lg border border-gray-200 px-6 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="cursor-pointer flex items-center justify-between text-base font-medium">
                  {question}
                  <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#005bff] via-[#090089] to-black text-white py-20 px-6">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 items-center gap-10">
          <div className="flex justify-center">
            <Image
              src="/tgimage.png"
              alt="Поддержка в Telegram"
              width={400}
              height={300}
              className="mx-auto"
            />
          </div>

          <div className="space-y-6 text-center md:text-left">
            <h2 className="font-heading text-3xl font-semibold">
              Остались вопросы?
            </h2>
            <p className="text-lg">
              Напишите нам в Telegram — мы всегда на связи!
            </p>
            <Link
              href="https://t.me/imYrist_bot"
              target="_blank"
              className="inline-block rounded-lg bg-[#e7cb05] px-6 py-3 font-medium text-black hover:opacity-90 transition"
            >
              Написать в поддержку
            </Link>
          </div>
        </div>
      </section>
      
      <Footer />
    </main>
  )
}