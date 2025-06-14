// app/(auth)/report/[id]/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface Contract {
  id: number
  filename: string
  role: string
  description: string
  status: string
  result: {
    overview: string
    risks: {
      critical: string[]
      moderate: string[]
      low: string[]
    }
    recommendations: string[]
    conclusion: string
    provider?: string
  }
  plainText: string
  createdAt: string
}

// Функция для глубокой очистки HTML от артефактов
function deepCleanHTML(html: string): string {
  let cleaned = html
  
  // 1. Удаляем все id атрибуты
  cleaned = cleaned.replace(/\sid="[^"]*"/g, '')
  
  // 2. Удаляем все теги <a> полностью
  cleaned = cleaned.replace(/<a\s[^>]*>.*?<\/a>/g, '')
  cleaned = cleaned.replace(/<a>.*?<\/a>/g, '')
  
  // 3. Удаляем пустые элементы списка в конце
  cleaned = cleaned.replace(/<li>\s*<\/li>/g, '')
  cleaned = cleaned.replace(/<ul>\s*<li>\s*<\/li>\s*<\/ul>/g, '')
  
  // 4. АГРЕССИВНАЯ очистка 2&gt;
  cleaned = cleaned.replace(/(<\/h1>)\s*2&gt;/g, '$1<h2>')
  cleaned = cleaned.replace(/\.2&gt;<\/h2>/g, '.</h2>')
  cleaned = cleaned.replace(/2&gt;<\/h2>/g, '</h2>')
  cleaned = cleaned.replace(/(<\/h\d>)\s*2&gt;/g, '$1<h2>')
  cleaned = cleaned.replace(/(<\/h3>)\s*2&gt;/g, '$1<h2>')
  cleaned = cleaned.replace(/(<\/p>)\s*2&gt;/g, '$1<h2>')
  cleaned = cleaned.replace(/([а-яА-Я])\s*2&gt;/g, '$1</h2>')
  
  // 5. Заменяем <h2&gt; на </h2>
  cleaned = cleaned.replace(/<h(\d)&gt;/g, '</h$1>')
  
  // 6. Заменяем странные конструкции типа <h<span>2&gt; на </h2>
  cleaned = cleaned.replace(/<h<span[^>]*>\d+&gt;/g, '</h2>')
  
  // 7. Удаляем лишние </h<span> в конце
  cleaned = cleaned.replace(/<\/h<span[^>]*>/g, '')
  
  // 8. Удаляем лишние <h<span> без закрывающих тегов
  cleaned = cleaned.replace(/<h<span[^>]*>/g, '')
  
  // 9. Удаляем span теги которые остались после очистки
  cleaned = cleaned.replace(/<span style="[^"]*">(\d+)<\/span>/g, '$1')
  
  // 10. Исправляем оставшиеся некорректные конструкции
  cleaned = cleaned.replace(/(<\/h<span>)+$/g, '')
  
  // 11. Финальная очистка оставшихся 2&gt;
  cleaned = cleaned.replace(/>\s*2&gt;([^<])/g, '><h2>$1')
  
  // 12. Финальная очистка
  cleaned = cleaned.replace(/\b\d&gt;/g, '')
  cleaned = cleaned.replace(/(<\/h<span>)+\s*$/, '')
  
  return cleaned
}

// Функция для извлечения номера пункта из текста риска
function extractClauseNumbers(riskText: string): string[] {
  const numbers: string[] = []
  
  // Паттерны для извлечения номеров пунктов с ТОЧНЫМ совпадением
  const patterns = [
    // "п. 6.1" или "пункт 6.1" - извлекаем точный номер
    /(?:п\.|пункт|Пункт)\s*(\d+\.\d+)/gi,
    // "п. 6" - только одиночная цифра
    /(?:п\.|пункт|Пункт)\s+(\d+)(?:\s|,|\.(?!\d)|$)/gi,
    // Просто "6.1" отдельно стоящее
    /(?:^|\s)(\d+\.\d+)(?:\s|,|\.|$)/gm
  ]
  
  patterns.forEach(pattern => {
    let match
    const regex = new RegExp(pattern)
    while ((match = regex.exec(riskText)) !== null) {
      if (match[1]) {
        const cleanNumber = match[1].trim()
        if (!numbers.includes(cleanNumber) && cleanNumber.length <= 10) {
          numbers.push(cleanNumber)
        }
      }
    }
  })
  
  return numbers
}

// Функция для добавления data-атрибутов к пунктам в тексте договора
function prepareContractText(text: string): string {
  let prepared = deepCleanHTML(text)
  
  // Удаляем странный номер 2870 и все что после него до следующего договора
  const weirdNumberPattern = /<span data-clause="2870"[^>]*>2870<\/span>/
  const weirdMatch = prepared.match(weirdNumberPattern)
  if (weirdMatch) {
    const weirdIndex = prepared.indexOf(weirdMatch[0])
    const nextContractStart = prepared.indexOf('<p><strong>Договор № </strong></p>', weirdIndex)
    if (nextContractStart > weirdIndex) {
      prepared = prepared.substring(0, weirdIndex) + prepared.substring(nextContractStart + '<p><strong>Договор № </strong></p>'.length)
    }
  }
  
  // Удаляем дублирование контента более агрессивно
  const contractStart = '<p><strong>Договор № </strong></p>'
  const firstIndex = prepared.indexOf(contractStart)
  if (firstIndex > -1) {
    let searchIndex = firstIndex + contractStart.length
    while (true) {
      const nextIndex = prepared.indexOf(contractStart, searchIndex)
      if (nextIndex === -1) break
      
      // Нашли дубликат - удаляем все от него до конца
      prepared = prepared.substring(0, nextIndex)
      break
    }
  }
  
  // Удаляем уже существующие span с data-clause чтобы пересоздать их правильно
  prepared = prepared.replace(/<span\s+data-clause="[^"]+"\s+class="clause-number">([^<]+)<\/span>/gi, '$1')
  
  // Обрабатываем вложенные списки правильно
  prepared = prepared.replace(/<ul>\s*<li>\s*<ol>/gi, '<ol>')
  prepared = prepared.replace(/<\/ol>\s*<\/li>\s*<\/ul>/gi, '</ol>')
  
  // Паттерны для поиска всех пунктов в тексте с ТОЧНЫМ совпадением
  const patterns = [
    // Пункт вида "2.1." или "2.1" в начале параграфа
    {
      pattern: /(<p>|<li>|>)(\s*)(\d+\.\d+)(\.)(\s+)/gm,
      replace: (match: string, g1: string, g2: string, number: string, dot: string, g5: string) => {
        return `${g1}${g2}<span data-clause="${number}" class="clause-number">${number}${dot}</span>${g5}`
      }
    },
    // Одиночный пункт "1." в начале
    {
      pattern: /(<p>|<li>|<strong>|>)(\s*)(\d+)(\.)(\s+)(?![0-9])/gm,
      replace: (match: string, g1: string, g2: string, number: string, dot: string, g5: string) => {
        return `${g1}${g2}<span data-clause="${number}" class="clause-number">${number}${dot}</span>${g5}`
      }
    },
    // Пункт после "п." или "пункт" с точным номером
    {
      pattern: /(п\.|пункт|Пункт)(\s+)(\d+(?:\.\d+)?)([,.\s])/gi,
      replace: (match: string, g1: string, g2: string, number: string, g4: string) => {
        return `${g1}${g2}<span data-clause="${number}" class="clause-number">${number}</span>${g4}`
      }
    }
  ]
  
  patterns.forEach(({ pattern, replace }) => {
    prepared = prepared.replace(pattern, replace)
  })
  
  // Финальная очистка
  prepared = prepared.replace(/<p>\s*<\/p>/gi, '')
  prepared = prepared.replace(/<\/li>\s*<\/ol>\s*<ol>\s*<li>/gi, '</li><li>')
  
  // Удаляем оставшийся мусор в конце
  const lastTableIndex = prepared.lastIndexOf('</table>')
  if (lastTableIndex > -1) {
    // Обрезаем все после последней таблицы + немного контента после нее
    const endIndex = prepared.indexOf('</div>', lastTableIndex)
    if (endIndex === -1 || endIndex - lastTableIndex > 1000) {
      prepared = prepared.substring(0, lastTableIndex + '</table>'.length)
    }
  }
  
  return prepared
}

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [highlightedClauses, setHighlightedClauses] = useState<Set<string>>(new Set())
  const [preparedContent, setPreparedContent] = useState<string>('')
  const [selectedRisk, setSelectedRisk] = useState<{ text: string; level: string } | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const contractRef = useRef<HTMLDivElement>(null)

  // Функция генерации PDF только с анализом
  const generateAnalysisPDF = async () => {
    if (!contract || !contract.result) return
    
    setPdfLoading(true)
    
    try {
      // Создаем временный контейнер для рендеринга
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.top = '-9999px'
      container.style.width = '210mm' // A4 width
      container.style.padding = '15mm 20mm'
      container.style.backgroundColor = 'white'
      container.style.fontFamily = 'Arial, sans-serif'
      container.style.fontSize = '11pt'
      container.style.lineHeight = '1.5'
      container.style.color = '#000'
      
      container.innerHTML = `
        <div style="max-width: 170mm; margin: 0 auto;">
          <h1 style="text-align: center; margin-bottom: 30px; font-size: 20pt; color: #1e40af;">АНАЛИЗ ДОГОВОРА</h1>
          
          <div style="margin-bottom: 25px; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
            <p style="margin: 5px 0;"><strong>Файл:</strong> ${contract.filename}</p>
            <p style="margin: 5px 0;"><strong>Роль:</strong> ${contract.role}</p>
            <p style="margin: 5px 0;"><strong>Дата анализа:</strong> ${new Date(contract.createdAt).toLocaleString('ru-RU')}</p>
            ${contract.description ? `<p style="margin: 5px 0;"><strong>Описание:</strong> ${contract.description}</p>` : ''}
          </div>
          
          <div style="margin-bottom: 25px;">
            <h2 style="color: #1e40af; font-size: 16pt; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">ОБЩЕЕ ЗАКЛЮЧЕНИЕ</h2>
            <p style="text-align: justify; line-height: 1.6;">${contract.result.overview}</p>
          </div>
          
          ${contract.result.risks.critical.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h2 style="color: #dc2626; font-size: 16pt; margin-bottom: 12px; border-bottom: 2px solid #fecaca; padding-bottom: 8px;">КРИТИЧЕСКИЕ РИСКИ (${contract.result.risks.critical.length})</h2>
              ${contract.result.risks.critical.map((risk, index) => `
                <div style="margin-bottom: 8px; padding: 10px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                  <p style="margin: 0; line-height: 1.5;"><strong>${index + 1}.</strong> ${risk}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${contract.result.risks.moderate.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h2 style="color: #d97706; font-size: 16pt; margin-bottom: 12px; border-bottom: 2px solid #fed7aa; padding-bottom: 8px;">УМЕРЕННЫЕ РИСКИ (${contract.result.risks.moderate.length})</h2>
              ${contract.result.risks.moderate.map((risk, index) => `
                <div style="margin-bottom: 8px; padding: 10px; background-color: #fffbeb; border-left: 4px solid #d97706; border-radius: 4px;">
                  <p style="margin: 0; line-height: 1.5;"><strong>${index + 1}.</strong> ${risk}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${contract.result.risks.low.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h2 style="color: #2563eb; font-size: 16pt; margin-bottom: 12px; border-bottom: 2px solid #bfdbfe; padding-bottom: 8px;">НИЗКИЕ РИСКИ (${contract.result.risks.low.length})</h2>
              ${contract.result.risks.low.map((risk, index) => `
                <div style="margin-bottom: 8px; padding: 10px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
                  <p style="margin: 0; line-height: 1.5;"><strong>${index + 1}.</strong> ${risk}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${contract.result.recommendations.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <h2 style="color: #059669; font-size: 16pt; margin-bottom: 12px; border-bottom: 2px solid #a7f3d0; padding-bottom: 8px;">РЕКОМЕНДАЦИИ</h2>
              ${contract.result.recommendations.map((rec, index) => `
                <div style="margin-bottom: 8px; padding: 10px; background-color: #ecfdf5; border-left: 4px solid #059669; border-radius: 4px;">
                  <p style="margin: 0; line-height: 1.5;"><strong>${index + 1}.</strong> ${rec}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${contract.result.conclusion ? `
            <div style="margin-bottom: 25px;">
              <h2 style="color: #1e40af; font-size: 16pt; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">ЗАКЛЮЧЕНИЕ</h2>
              <p style="text-align: justify; line-height: 1.6;">${contract.result.conclusion}</p>
            </div>
          ` : ''}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 10pt;">
            <p>Анализ выполнен: ${contract.result.provider === 'yandex' ? 'ImYrist 1.0' : 'Тестовая система'}</p>
            <p>Дата формирования отчета: ${new Date().toLocaleString('ru-RU')}</p>
          </div>
        </div>
      `
      
      document.body.appendChild(container)
      
      // Ждем немного для полной загрузки стилей
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Конвертируем HTML в canvas с высоким качеством
      const canvas = await html2canvas(container, {
        scale: 2, // Высокое разрешение
        useCORS: true,
        logging: false,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight,
        backgroundColor: '#ffffff'
      })
      
      // Создаем PDF с правильными отступами
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      // Размеры страницы A4
      const pageWidth = 210
      const pageHeight = 297
      
      // Отступы страницы (в мм)
      const marginTop = 20    // Отступ сверху
      const marginBottom = 20 // Отступ снизу
      const marginLeft = 0    // Отступ слева (0, так как контент уже имеет padding)
      const marginRight = 0   // Отступ справа (0, так как контент уже имеет padding)
      
      // Рабочая область страницы
      const contentWidth = pageWidth - marginLeft - marginRight
      const contentHeight = pageHeight - marginTop - marginBottom
      
      // Размеры изображения
      const imgWidth = contentWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // Рассчитываем количество страниц
      const totalPages = Math.ceil(imgHeight / contentHeight)
      
      // Создаем изображение
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      
      // Добавляем страницы
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage()
        }
        
        // Рассчитываем позицию для текущей страницы
        const yOffset = -i * contentHeight
        
        // Добавляем изображение с учетом отступов
        pdf.addImage(
          imgData, 
          'JPEG', 
          marginLeft, 
          marginTop + yOffset, 
          imgWidth, 
          imgHeight
        )
        
        // Добавляем номер страницы
        pdf.setFontSize(10)
        pdf.setTextColor(128, 128, 128)
        pdf.text(
          `Страница ${i + 1} из ${totalPages}`, 
          pageWidth / 2, 
          pageHeight - 10, 
          { align: 'center' }
        )
      }
      
      // Удаляем временный контейнер
      document.body.removeChild(container)
      
      // Сохраняем PDF
      const fileName = `Анализ_${contract.filename.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)
      
    } catch (error) {
      console.error('Ошибка при генерации PDF:', error)
      alert('Произошла ошибка при создании PDF. Попробуйте еще раз.')
    } finally {
      setPdfLoading(false)
    }
  }

  // Стили для подсветки
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      /* Анимация появления подсветки */
      @keyframes highlightPulse {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
        }
        50% {
          transform: scale(1.02);
          box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
        }
      }
      
      /* Стили для интерактивной подсветки */
      [data-clause] {
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 4px;
        padding: 0 3px;
        cursor: default;
        display: inline-block;
      }
      
      [data-clause]::before {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 6px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      [data-clause].highlight-critical {
        background-color: #fecaca !important;
        padding: 3px 8px !important;
        font-weight: 700 !important;
        color: #991b1b !important;
        animation: highlightPulse 1s ease-out;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
      }
      
      [data-clause].highlight-critical::before {
        background: linear-gradient(45deg, #fecaca, #fca5a5);
        opacity: 0.3;
      }
      
      [data-clause].highlight-moderate {
        background-color: #fef3c7 !important;
        padding: 3px 8px !important;
        font-weight: 700 !important;
        color: #92400e !important;
        animation: highlightPulse 1s ease-out;
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
      }
      
      [data-clause].highlight-moderate::before {
        background: linear-gradient(45deg, #fef3c7, #fde68a);
        opacity: 0.3;
      }
      
      [data-clause].highlight-low {
        background-color: #dbeafe !important;
        padding: 3px 8px !important;
        font-weight: 700 !important;
        color: #1e40af !important;
        animation: highlightPulse 1s ease-out;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
      }
      
      [data-clause].highlight-low::before {
        background: linear-gradient(45deg, #dbeafe, #bfdbfe);
        opacity: 0.3;
      }
      
      /* Подсказка при наведении на пункт */
      [data-clause].highlighted {
        position: relative;
      }
      
      [data-clause].highlighted::after {
        content: attr(data-risk-preview);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: normal;
        white-space: nowrap;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
        z-index: 1000;
        margin-bottom: 8px;
      }
      
      [data-clause].highlighted:hover::after {
        opacity: 1;
      }
      
      /* Анимация при наведении на риск */
      .risk-item {
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      
      .risk-item::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transform: translateX(-100%);
        transition: transform 0.6s ease;
      }
      
      .risk-item:hover {
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      .risk-item:hover::before {
        transform: translateX(100%);
      }
      
      .risk-item.active {
        transform: translateX(8px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      }
      
      /* Плавная прокрутка к выделенному элементу */
      .contract-content {
        scroll-behavior: smooth;
      }
      
      /* Стили для списков в контракте */
      .contract-content ul,
      .contract-content ol {
        margin: 10px 0;
        padding-left: 30px;
      }
      
      .contract-content li {
        margin: 5px 0;
        list-style-position: outside;
      }
      
      .contract-content ol {
        list-style-type: decimal;
      }
      
      .contract-content ul {
        list-style-type: disc;
      }
      
      .contract-content ol ol {
        list-style-type: lower-alpha;
      }
      
      /* Индикатор количества рисков */
      .risk-count-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        padding: 0 6px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 8px;
      }
      
      .risk-count-indicator.critical {
        background-color: #dc2626;
        color: white;
      }
      
      .risk-count-indicator.moderate {
        background-color: #d97706;
        color: white;
      }
      
      .risk-count-indicator.low {
        background-color: #2563eb;
        color: white;
      }
      
      @media print {
        .no-print {
          display: none !important;
        }
        
        /* При печати показываем все подсветки */
        [data-clause] {
          background-color: transparent !important;
          font-weight: normal !important;
          color: inherit !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Загрузка контракта
  useEffect(() => {
    const fetchContract = async () => {
      try {
        const response = await fetch(`/api/contracts/${params.id}`)
        
        if (!response.ok) {
          throw new Error('Контракт не найден')
        }
        const data = await response.json()
        setContract(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchContract()
    }
  }, [params.id])

  // Подготовка контента при загрузке контракта
  useEffect(() => {
    if (contract?.plainText) {
      const prepared = prepareContractText(contract.plainText)
      setPreparedContent(prepared)
    }
  }, [contract])

  // Обновление подсветки в DOM
  useEffect(() => {
    // Удаляем все существующие классы подсветки
    document.querySelectorAll('[data-clause]').forEach(el => {
      el.classList.remove('highlight-critical', 'highlight-moderate', 'highlight-low', 'highlighted')
      el.removeAttribute('data-risk-preview')
    })
    
    // Добавляем классы для выделенных пунктов
    highlightedClauses.forEach(clauseInfo => {
      const [clauseNumber, level] = clauseInfo.split('|')
      const elements = document.querySelectorAll(`[data-clause="${clauseNumber}"]`)
      
      elements.forEach(el => {
        el.classList.add(`highlight-${level}`, 'highlighted')
        if (selectedRisk) {
          el.setAttribute('data-risk-preview', selectedRisk.text.substring(0, 50) + '...')
        }
      })
    })
    
    // Прокручиваем к первому выделенному элементу
    if (highlightedClauses.size > 0 && contractRef.current) {
      const firstHighlighted = contractRef.current.querySelector('[data-clause].highlighted')
      if (firstHighlighted) {
        firstHighlighted.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [highlightedClauses, preparedContent, selectedRisk])

  // Обработчики наведения мыши
  const handleRiskHover = (riskText: string, level: 'critical' | 'moderate' | 'low') => {
    const clauseNumbers = extractClauseNumbers(riskText)
    const newHighlights = new Set<string>()
    
    clauseNumbers.forEach(number => {
      newHighlights.add(`${number}|${level}`)
    })
    
    setHighlightedClauses(newHighlights)
    setSelectedRisk({ text: riskText, level })
  }

  const handleRiskLeave = () => {
    setHighlightedClauses(new Set())
    setSelectedRisk(null)
  }

  // Обработчик клика по риску для постоянной подсветки
  const handleRiskClick = (riskText: string, level: 'critical' | 'moderate' | 'low') => {
    const clauseNumbers = extractClauseNumbers(riskText)
    const newHighlights = new Set<string>()
    
    clauseNumbers.forEach(number => {
      newHighlights.add(`${number}|${level}`)
    })
    
    // Если кликнули на тот же риск, снимаем выделение
    if (selectedRisk?.text === riskText) {
      setHighlightedClauses(new Set())
      setSelectedRisk(null)
    } else {
      setHighlightedClauses(newHighlights)
      setSelectedRisk({ text: riskText, level })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка отчета...</p>
        </div>
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    )
  }

  const result = contract.result

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Анализ не готов</h1>
          <p className="text-gray-600 mb-4">Результат анализа пока недоступен</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    )
  }

  // Подсчет общего количества рисков
  const totalRisks = {
    critical: result.risks?.critical?.length || 0,
    moderate: result.risks?.moderate?.length || 0,
    low: result.risks?.low?.length || 0,
    total: (result.risks?.critical?.length || 0) + (result.risks?.moderate?.length || 0) + (result.risks?.low?.length || 0)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Назад
              </button>
              <h1 className="text-xl font-semibold">imYrist</h1>
            </div>
            <div className="flex items-center space-x-4">
              {result?.provider && (
                <span className="text-sm text-gray-500">
                  Анализ: {result.provider === 'yandex' ? 'ImYrist 1.0' : 'Тестовые данные'}
                </span>
              )}
              <button
                onClick={generateAnalysisPDF}
                disabled={pdfLoading}
                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Скачать PDF с анализом"
              >
                <Download className="h-4 w-4 mr-2" />
                {pdfLoading ? 'Создание PDF...' : 'Скачать PDF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-64px)]">
        <div className="flex gap-6 p-6 h-full">
          {/* Left Sidebar with Analysis - Fixed with scroll */}
          <div className="w-96 flex-shrink-0 h-full flex flex-col">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1">
                {/* Статистика рисков */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Найдено рисков: {totalRisks.total}</h3>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-600 mr-1" />
                      Критические: {totalRisks.critical}
                    </span>
                    <span className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mr-1" />
                      Умеренные: {totalRisks.moderate}
                    </span>
                    <span className="flex items-center">
                      <Info className="h-4 w-4 text-blue-600 mr-1" />
                      Низкие: {totalRisks.low}
                    </span>
                  </div>
                </div>

                <h2 className="text-lg font-semibold mb-4">Общее заключение</h2>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-gray-700 leading-relaxed">{result?.overview || 'Анализ недоступен'}</p>
                </div>

                {/* Critical Risks */}
                {result?.risks?.critical?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base font-medium text-red-700 mb-3 flex items-center justify-between">
                      Критические Риски
                      <span className="risk-count-indicator critical">{result.risks.critical.length}</span>
                    </h3>
                    <div className="space-y-2">
                      {result.risks.critical.map((risk, index) => (
                        <div 
                          key={index} 
                          className={`risk-item bg-red-50 border-l-4 border-red-500 p-3 text-sm rounded-r-md ${
                            selectedRisk?.text === risk ? 'active' : ''
                          }`}
                          onMouseEnter={() => handleRiskHover(risk, 'critical')}
                          onMouseLeave={handleRiskLeave}
                          onClick={() => handleRiskClick(risk, 'critical')}
                        >
                          <span className="text-red-700">• {risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Moderate Risks */}
                {result?.risks?.moderate?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base font-medium text-yellow-700 mb-3 flex items-center justify-between">
                      Умеренные Риски
                      <span className="risk-count-indicator moderate">{result.risks.moderate.length}</span>
                    </h3>
                    <div className="space-y-2">
                      {result.risks.moderate.map((risk, index) => (
                        <div 
                          key={index} 
                          className={`risk-item bg-yellow-50 border-l-4 border-yellow-500 p-3 text-sm rounded-r-md ${
                            selectedRisk?.text === risk ? 'active' : ''
                          }`}
                          onMouseEnter={() => handleRiskHover(risk, 'moderate')}
                          onMouseLeave={handleRiskLeave}
                          onClick={() => handleRiskClick(risk, 'moderate')}
                        >
                          <span className="text-yellow-700">• {risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Low Risks */}
                {result?.risks?.low?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base font-medium text-blue-700 mb-3 flex items-center justify-between">
                      Низкие Риски
                      <span className="risk-count-indicator low">{result.risks.low.length}</span>
                    </h3>
                    <div className="space-y-2">
                      {result.risks.low.map((risk, index) => (
                        <div 
                          key={index} 
                          className={`risk-item bg-blue-50 border-l-4 border-blue-500 p-3 text-sm rounded-r-md ${
                            selectedRisk?.text === risk ? 'active' : ''
                          }`}
                          onMouseEnter={() => handleRiskHover(risk, 'low')}
                          onMouseLeave={handleRiskLeave}
                          onClick={() => handleRiskClick(risk, 'low')}
                        >
                          <span className="text-blue-700">• {risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {result?.recommendations?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base font-medium text-green-700 mb-3 flex items-center justify-between">
                      Рекомендации
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </h3>
                    <div className="space-y-2">
                      {result.recommendations.map((rec, index) => (
                        <div 
                          key={index} 
                          className="bg-green-50 border-l-4 border-green-500 p-3 text-sm rounded-r-md"
                        >
                          <span className="text-green-700">{index + 1}. {rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="flex-1 h-full overflow-y-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{contract.filename}</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                  <span>Роль: {contract.role}</span>
                  <span>•</span>
                  <span>{new Date(contract.createdAt).toLocaleString('ru-RU')}</span>
                </div>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Как читать рекомендации:</h3>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• Критические риски - требуют безотлагательных мер и максимального внимания</p>
                  <p>• Умеренные риски - значимы, нуждаются в плановом изменении и регулярном контроле</p>
                  <p>• Низкие риски - допускают изменения по усмотрению, без срочности</p>
                </div>
              </div>

              <div className="mb-6 text-sm text-gray-600 flex flex-wrap gap-4">
                <span className="flex items-center">
                  <span className="w-4 h-4 mr-2 rounded" style={{backgroundColor: '#fecaca', borderLeft: '4px solid #ef4444'}}></span>
                  Критические риски
                </span>
                <span className="flex items-center">
                  <span className="w-4 h-4 mr-2 rounded" style={{backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b'}}></span>
                  Умеренные риски
                </span>
                <span className="flex items-center">
                  <span className="w-4 h-4 mr-2 rounded" style={{backgroundColor: '#dbeafe', borderLeft: '4px solid #3b82f6'}}></span>
                  Низкие риски
                </span>
              </div>

              <div className="border-t pt-6">
                <div 
                  ref={contractRef}
                  className="contract-content text-gray-800 leading-relaxed"
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: preparedContent || '<p>Текст договора недоступен</p>'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}