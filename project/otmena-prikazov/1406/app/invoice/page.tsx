// app/invoice/page.tsx
import { Mail, FileText, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function InvoicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Building className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Счет для юридических лиц</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Для выставления счета на оплату услуг анализа документов, 
                пожалуйста, свяжитесь с нами по электронной почте.
              </p>
              
              <div className="bg-gray-100 rounded-lg p-6 space-y-3">
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <Mail className="w-5 h-5" />
                  <a href="mailto:info@imyrist.ru" className="text-lg font-medium hover:underline">
                    info@imyrist.ru
                  </a>
                </div>
                
                <p className="text-sm text-gray-500">
                  Укажите в письме:
                </p>
                <ul className="text-sm text-gray-600 text-left max-w-xs mx-auto space-y-1">
                  <li>• Реквизиты организации</li>
                  <li>• ИНН и КПП</li>
                  <li>• Количество анализов</li>
                  <li>• Контактное лицо</li>
                </ul>
              </div>
              
              <div className="pt-4 space-y-3">
                <p className="text-sm text-gray-600">
                  Мы выставим счет в течение 1 рабочего дня
                </p>
                
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Работаем по договору оферты</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 text-center">
              <a 
                href="/dashboard" 
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Вернуться к анализу документов
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}