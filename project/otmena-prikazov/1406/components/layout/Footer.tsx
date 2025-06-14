// components/layout/Footer.tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-6xl mx-auto py-10 px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
          {/* Логотип и информация о компании */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="font-heading text-xl">
              <span className="text-white">im</span>
              <span className="text-[#e7cb05]">Yrist</span>
            </Link>
            <div className="text-sm text-gray-400 space-y-1">
              <p>© 2025 ИП Чвилев Георгий Юрьевич.</p>
              <p>Все права защищены.</p>
              <p>ИНН 780242934360</p>
            </div>
          </div>

          {/* Навигация */}
          <nav className="flex flex-col gap-2 text-sm">
            <Link href="/legal" className="hover:text-[#e7cb05] transition-colors">
              Политика конфиденциальности
            </Link>
            <Link href="/#pricing" className="hover:text-[#e7cb05] transition-colors">
              Тарифы
            </Link>
          </nav>

          {/* Поддержка */}
          <div className="flex flex-col gap-2 text-sm">
            <h3 className="font-medium text-white mb-2">Поддержка</h3>
            <Link 
              href="https://t.me/imYrist_bot" 
              target="_blank"
              className="hover:text-[#e7cb05] transition-colors"
            >
              Telegram-бот
            </Link>
            <Link 
              href="mailto:info@imyrist.ru"
              className="hover:text-[#e7cb05] transition-colors"
            >
              info@imyrist.ru
            </Link>
          </div>
        </div>

        {/* Разделитель */}
        <div className="border-t border-gray-700 mt-8 pt-6 text-center">
          <p className="text-xs text-gray-500">
            AI-анализ договоров не заменяет консультацию юриста. 
            Сервис носит информационно-рекомендательный характер.
          </p>
        </div>
      </div>
    </footer>
  )
}