// utils/documentParser.ts - Версия с pdfjs-dist
import mammoth from 'mammoth'

export interface ParsedDocument {
  text: string
  html: string
  pageCount?: number
  metadata?: any
  isScanned?: boolean
}

export async function parseDocument(buffer: Buffer, mimeType: string): Promise<ParsedDocument> {
  console.log('Parsing document with type:', mimeType)
  
  switch (mimeType) {
    case 'application/pdf':
      return parsePDF(buffer)
    
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseWord(buffer)
    
    default:
      throw new Error(`Неподдерживаемый формат файла: ${mimeType}`)
  }
}

// Парсинг Word документов (только DOCX)
async function parseWord(buffer: Buffer): Promise<ParsedDocument> {
  console.log('Parsing DOCX document...')
  
  try {
    const result = await mammoth.convertToHtml({ buffer })
    const textResult = await mammoth.extractRawText({ buffer })
    
    // Улучшаем структуру HTML
    let improvedHtml = result.value
    improvedHtml = improveWordHtmlStructure(improvedHtml)
    
    return {
      text: textResult.value,
      html: improvedHtml,
      isScanned: false
    }
  } catch (error) {
    console.error('DOCX parsing error:', error)
    throw new Error('Ошибка при обработке DOCX файла. Убедитесь, что файл не поврежден.')
  }
}

// Парсинг PDF документов с использованием pdfjs-dist
async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  console.log('Parsing PDF document...')
  
  try {
    // Проверяем, в каком окружении мы находимся
    if (typeof window === 'undefined') {
      // Серверная сторона - используем pdf-parse как fallback
      try {
        const pdfParse = await import('pdf-parse')
        const data = await pdfParse.default(buffer)
        
        const textLength = data.text.trim().length
        const pageCount = data.numpages
        const avgTextPerPage = textLength / pageCount
        
        console.log(`PDF stats: ${pageCount} pages, ${textLength} chars, ${avgTextPerPage} chars/page`)
        
        if (avgTextPerPage < 100) {
          return createScanWarning(pageCount)
        }
        
        const improvedHtml = improvePDFHtmlStructure(data.text)
        
        return {
          text: data.text,
          html: improvedHtml,
          pageCount: pageCount,
          metadata: data.info,
          isScanned: false
        }
      } catch (pdfParseError) {
        console.error('pdf-parse error:', pdfParseError)
        // Если pdf-parse не работает, возвращаем базовую информацию
        return {
          text: 'Ошибка при обработке PDF файла',
          html: '<p>Не удалось извлечь текст из PDF документа. Попробуйте конвертировать его в другой формат.</p>',
          pageCount: 0,
          isScanned: false
        }
      }
    } else {
      // Клиентская сторона - используем pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist')
      
      // Настройка worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      
      // Конвертируем Buffer в Uint8Array
      const uint8Array = new Uint8Array(buffer)
      
      // Загружаем документ
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
      const pdf = await loadingTask.promise
      
      const pageCount = pdf.numPages
      let fullText = ''
      
      // Извлекаем текст из каждой страницы
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n'
      }
      
      const textLength = fullText.trim().length
      const avgTextPerPage = textLength / pageCount
      
      if (avgTextPerPage < 100) {
        return createScanWarning(pageCount)
      }
      
      const improvedHtml = improvePDFHtmlStructure(fullText)
      
      return {
        text: fullText,
        html: improvedHtml,
        pageCount: pageCount,
        isScanned: false
      }
    }
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Ошибка при обработке PDF файла: ' + error.message)
  }
}

// Создание предупреждения для сканированных документов
function createScanWarning(pageCount: number): ParsedDocument {
  console.log('PDF appears to be scanned. OCR required but not implemented in this version.')
  
  return {
    text: 'ВНИМАНИЕ: Документ является сканированным изображением. Для анализа требуется распознавание текста (OCR).',
    html: `
      <div class="ocr-warning" style="background-color: #fee; border: 1px solid #f00; padding: 20px; margin: 20px 0; border-radius: 6px;">
        <h3 style="color: #c00; margin-top: 0;">⚠️ Документ требует распознавания</h3>
        <p>Этот PDF файл является сканированным изображением и не содержит текстового слоя.</p>
        <p>Для анализа таких документов требуется OCR (оптическое распознавание символов).</p>
        <p><strong>Рекомендации:</strong></p>
        <ul>
          <li>Попробуйте найти текстовую версию документа</li>
          <li>Используйте онлайн-сервисы OCR для извлечения текста</li>
          <li>Перепечатайте документ в текстовом редакторе</li>
        </ul>
      </div>
    `,
    pageCount: pageCount,
    isScanned: true
  }
}

// Улучшение структуры HTML из Word
function improveWordHtmlStructure(html: string): string {
  // Обработка нумерованных пунктов
  html = html.replace(/<p>(\d+\.\d+\.?)\s+/g, '<p><strong class="clause-number" data-clause="$1">$1</strong> ')
  html = html.replace(/<p>(\d+\.)\s+/g, '<p><strong class="clause-number" data-clause="$1">$1</strong> ')
  
  // Обработка пунктов с префиксом "п." или "пункт"
  html = html.replace(/<p>(п\.|пункт)\s*(\d+(?:\.\d+)*)\s+/gi, '<p>$1 <strong class="clause-number" data-clause="$2">$2</strong> ')
  
  // Обработка заголовков (текст в верхнем регистре)
  html = html.replace(/<p>([А-ЯЁ\s\d\.]+)<\/p>/g, (match, p1) => {
    if (p1.trim().length > 3 && p1.trim().length < 100 && !/[,;:!?]/.test(p1)) {
      return `<h3>${p1}</h3>`
    }
    return match
  })
  
  // Обработка маркированных списков
  html = html.replace(/<p>\s*[-–—•]\s+(.+?)<\/p>/g, '<li>$1</li>')
  
  // Оборачиваем последовательные <li> в <ul>
  html = html.replace(/(<li>.*?<\/li>\s*)+/g, (match) => {
    return `<ul>${match}</ul>`
  })
  
  return html
}

// Улучшение структуры HTML из PDF
function improvePDFHtmlStructure(text: string): string {
  const lines = text.split('\n')
  let html = '<div class="pdf-content">'
  let inList = false
  let currentParagraph = ''
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    if (!trimmed) {
      // Пустая строка - конец параграфа
      if (currentParagraph) {
        if (inList) {
          html += '</ul>'
          inList = false
        }
        html += formatParagraph(currentParagraph)
        currentParagraph = ''
      }
      continue
    }
    
    // Проверяем, является ли строка элементом списка
    if (/^[-–—•]\s/.test(trimmed)) {
      if (currentParagraph) {
        html += formatParagraph(currentParagraph)
        currentParagraph = ''
      }
      if (!inList) {
        html += '<ul>'
        inList = true
      }
      html += `<li>${trimmed.substring(2)}</li>`
    } else {
      // Добавляем к текущему параграфу
      currentParagraph += (currentParagraph ? ' ' : '') + trimmed
    }
  }
  
  // Обрабатываем последний параграф
  if (currentParagraph) {
    if (inList) {
      html += '</ul>'
    }
    html += formatParagraph(currentParagraph)
  }
  
  if (inList) {
    html += '</ul>'
  }
  
  html += '</div>'
  return html
}

// Форматирование параграфа с определением типа
function formatParagraph(text: string): string {
  const trimmed = text.trim()
  
  // Проверяем различные форматы пунктов
  if (/^\d+\.\d+\.?\s/.test(trimmed)) {
    // Пункт вида 2.1. или 2.1
    const match = trimmed.match(/^(\d+\.\d+\.?)\s+(.*)$/)
    if (match) {
      return `<p><strong class="clause-number" data-clause="${match[1]}">${match[1]}</strong> ${match[2]}</p>`
    }
  } else if (/^\d+\.\s/.test(trimmed)) {
    // Пункт вида 1.
    const match = trimmed.match(/^(\d+\.)\s+(.*)$/)
    if (match) {
      return `<p><strong class="clause-number" data-clause="${match[1]}">${match[1]}</strong> ${match[2]}</p>`
    }
  } else if (/^(п\.|пункт)\s*\d+/i.test(trimmed)) {
    // Пункт с префиксом
    const match = trimmed.match(/^(п\.|пункт)\s*(\d+(?:\.\d+)*)\s+(.*)$/i)
    if (match) {
      return `<p>${match[1]} <strong class="clause-number" data-clause="${match[2]}">${match[2]}</strong> ${match[3]}</p>`
    }
  } else if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 100) {
    // Заголовок
    return `<h3>${trimmed}</h3>`
  }
  
  // Обычный параграф
  return `<p>${trimmed}</p>`
}

// Экспорт типов файлов
export const ACCEPTED_FILE_TYPES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/pdf': '.pdf'
} as const

// Вспомогательная функция для определения, является ли PDF сканом
export async function isPDFScanned(buffer: Buffer): Promise<boolean> {
  try {
    if (typeof window === 'undefined') {
      // Серверная сторона
      try {
        const pdfParse = await import('pdf-parse')
        const data = await pdfParse.default(buffer)
        const avgTextPerPage = data.text.trim().length / data.numpages
        return avgTextPerPage < 100
      } catch {
        return true
      }
    } else {
      // Клиентская сторона
      const pdfjsLib = await import('pdfjs-dist')
      const uint8Array = new Uint8Array(buffer)
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
      const pdf = await loadingTask.promise
      
      let totalText = 0
      for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        totalText += textContent.items.reduce((acc: number, item: any) => acc + item.str.length, 0)
      }
      
      const avgTextPerPage = totalText / Math.min(3, pdf.numPages)
      return avgTextPerPage < 100
    }
  } catch {
    return true // Если не удалось распарсить, считаем сканом
  }
}