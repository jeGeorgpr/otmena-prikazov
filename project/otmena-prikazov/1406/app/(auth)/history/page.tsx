// app/(auth)/history/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface Contract {
  id: number
  filename: string
  role: string
  description: string
  status: string
  createdAt: string
  result?: any
}

export default function HistoryPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      const response = await fetch('/api/contracts')
      if (response.ok) {
        const data = await response.json()
        setContracts(data)
      } else {
        console.error('Failed to fetch contracts')
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'done':
        return 'Готов'
      case 'processing':
        return 'Обрабатывается'
      case 'error':
        return 'Ошибка'
      default:
        return 'Неизвестно'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 md:h-32 md:w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">Загрузка истории...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">История анализов</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base text-gray-600">Все ваши проверенные договоры</p>
        </div>

        {contracts.length === 0 ? (
          <div className="text-center py-8 sm:py-10 md:py-12">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">Нет анализов</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 px-4">Вы еще не анализировали ни одного договора.</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 text-sm sm:text-base"
            >
              Начать первый анализ
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h2 className="text-sm sm:text-base md:text-lg font-medium text-gray-900">
                Всего договоров: {contracts.length}
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {contracts.map((contract) => (
                <div key={contract.id} className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors">
                  <div className="space-y-3">
                    {/* Основная информация */}
                    <div className="flex items-start gap-2 sm:gap-3">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 sm:truncate" title={contract.filename}>
                          {contract.filename}
                        </h3>
                        {contract.description && (
                          <p className="mt-0.5 text-xs sm:text-sm text-gray-600 line-clamp-2" title={contract.description}>
                            {contract.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Мета-информация и действия */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      {/* Метаданные */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Роль:</span> {contract.role}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>{new Date(contract.createdAt).toLocaleString('ru-RU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      
                      {/* Статус и действия */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(contract.status)}
                          <span className="text-xs sm:text-sm text-gray-600">
                            {getStatusText(contract.status)}
                          </span>
                        </div>
                        
                        {contract.status === 'done' && (
                          <Link
                            href={`/report/${contract.id}`}
                            className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 text-xs sm:text-sm whitespace-nowrap transition-colors"
                          >
                            Открыть отчет
                          </Link>
                        )}
                        
                        {contract.status === 'processing' && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm whitespace-nowrap">
                            Анализируется...
                          </span>
                        )}
                        
                        {contract.status === 'error' && (
                          <span className="bg-red-100 text-red-800 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm whitespace-nowrap">
                            Ошибка
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}