// app/(auth)/layout.tsx
'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Home, History, User, Menu, X, LogOut, Wallet, FileText, Gift, Shield, HelpCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import Footer from '@/components/layout/Footer'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Проверка статуса администратора
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user?.id) {
        try {
          const res = await fetch('/api/balance')
          if (res.ok) {
            const data = await res.json()
            setIsAdmin(data.isAdmin)
          }
        } catch (error) {
          console.error('Error checking admin status:', error)
        }
      }
    }
    
    if (session) {
      checkAdminStatus()
    }
  }, [session])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005bff]"></div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin')
  }

  const navigation = [
    { name: 'Главная', href: '/dashboard', icon: Home },
    { name: 'Кошелек', href: '/wallet', icon: Wallet },
    { name: 'История', href: '/history', icon: History },
    { name: 'FAQ', href: '/faq', icon: HelpCircle },
    { name: 'Личный кабинет', href: '/profile', icon: User },
  ]

  const adminNavigation = [
    { name: 'Промокоды', href: '/admin/promo', icon: Gift },
    // Добавьте другие админские страницы здесь
    // { name: 'Пользователи', href: '/admin/users', icon: Users },
    // { name: 'Статистика', href: '/admin/stats', icon: BarChart },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center">
                <FileText className="h-8 w-8 text-[#005bff]" />
                <span className="ml-2 text-xl font-bold">
                  <span className="text-[#005bff]">im</span>
                  <span className="text-[#e7cb05]">Yrist</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'text-[#005bff] bg-[#005bff]/10'
                        : 'text-gray-700 hover:text-[#005bff] hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
              
              {/* Admin navigation - desktop */}
              {isAdmin && (
                <>
                  <div className="border-l border-gray-300 h-6 self-center" />
                  {adminNavigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          pathname === item.href || pathname.startsWith(item.href + '/')
                            ? 'text-[#005bff] bg-[#005bff]/10'
                            : 'text-gray-700 hover:text-[#005bff] hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </Link>
                    )
                  })}
                </>
              )}
            </nav>

            <div className="flex items-center space-x-4">
              {isAdmin && (
                <Shield className="h-4 w-4 text-[#005bff] hidden md:block"  />
              )}
              <span className="text-sm text-gray-700 hidden md:block">
                {session?.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-md transition-colors"
                title="Выйти"
              >
                <LogOut className="h-5 w-5" />
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'text-[#005bff] bg-[#005bff]/10'
                        : 'text-gray-700 hover:text-[#005bff] hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
              
              {/* Admin navigation - mobile */}
              {isAdmin && adminNavigation.length > 0 && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Администрирование
                  </div>
                  {adminNavigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                          pathname === item.href || pathname.startsWith(item.href + '/')
                            ? 'text-[#005bff] bg-[#005bff]/10'
                            : 'text-gray-700 hover:text-[#005bff] hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                    )
                  })}
                </>
              )}
              
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                  {isAdmin && <Shield className="h-4 w-4 text-[#005bff] mr-2" />}
                  {session?.user?.email}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}