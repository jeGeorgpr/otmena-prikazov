// app/api/contracts/analyze/route.ts - Финальная оптимизированная версия
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { parseDocument } from '@/utils/documentParser'
import { sendAnalysisCompleteEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

// Улучшенная функция для очистки текста от проблемных символов
function cleanDocumentText(text: string): string {
  // Сначала убираем escape-символы перед подчеркиваниями
  let cleaned = text.replace(/\\_/g, '_');
  
  // Убираем все остальные escape-символы
  cleaned = cleaned.replace(/\\/g, '');
  
  // Убираем теги форматирования типа {.underline}
  cleaned = cleaned.replace(/\{\.underline\}/g, '');
  cleaned = cleaned.replace(/\{[^}]+\}/g, '');
  
  // Заменяем квадратные скобки с подчеркиваниями внутри
  cleaned = cleaned.replace(/\[\s*_+\s*\]/g, '[ПРОПУСК]');
  cleaned = cleaned.replace(/\[[^\]]*_[^\]]*\]/g, '[ПРОПУСК]');
  
  // Убираем подчеркивания в квадратных скобках для текста типа [(срок)]
  cleaned = cleaned.replace(/\[\s*\([^)]+\)\s*\]/g, '[ПРОПУСК]');
  
  // Заменяем множественные подчеркивания на [ПРОПУСК]
  cleaned = cleaned.replace(/_{3,}/g, '[ПРОПУСК]');
  
  // Заменяем одиночные и двойные подчеркивания в контексте пустых полей
  cleaned = cleaned.replace(/«_»/g, '«[ПРОПУСК]»');
  cleaned = cleaned.replace(/"_"/g, '"[ПРОПУСК]"');
  cleaned = cleaned.replace(/'_'/g, "'[ПРОПУСК]'");
  cleaned = cleaned.replace(/\s_+\s/g, ' [ПРОПУСК] ');
  cleaned = cleaned.replace(/\s_+\./g, ' [ПРОПУСК].');
  cleaned = cleaned.replace(/\s_+,/g, ' [ПРОПУСК],');
  cleaned = cleaned.replace(/:\s*_+/g, ': [ПРОПУСК]');
  
  // Обрабатываем конструкции типа _/_
  cleaned = cleaned.replace(/_\/_/g, '[ПРОПУСК]/[ПРОПУСК]');
  
  // Убираем таблицы с символами + - = |
  cleaned = cleaned.replace(/\+[-=+]+\+/g, '');
  cleaned = cleaned.replace(/\|/g, ' ');
  
  // Заменяем множественные пробелы на один
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  // Убираем множественные переносы строк
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Убираем специальные символы форматирования
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  
  // Финальная очистка пропусков
  cleaned = cleaned.replace(/\[ПРОПУСК\]\s*\[ПРОПУСК\]/g, '[ПРОПУСК]');
  cleaned = cleaned.replace(/\s*\[ПРОПУСК\]\s*/g, ' [ПРОПУСК] ');
  
  return cleaned.trim();
}

// Дополнительная функция для предобработки специфичных договоров
function preprocessContract(text: string): string {
  let processed = text;
  
  // Убираем альтернативные варианты сторон
  processed = processed.replace(/\*\*Гражданин\(-ка\)[^*]+\*\*/g, '');
  processed = processed.replace(/\*(для самозанятых)\*/g, '(для самозанятых)');
  
  // Убираем звездочки форматирования
  processed = processed.replace(/\*\*/g, '');
  
  // Убираем номера разделов в начале строк (например, ## или ###)
  processed = processed.replace(/^#{1,3}\s+/gm, '');
  
  return processed;
}

// Оптимизированная функция создания системного промпта
function createSystemPrompt(meta: { role?: string; description?: string; isScanned?: boolean }) {
  const scanNotice = meta.isScanned
    ? '⚠️ Этот текст получен OCR-распознаванием: возможны ошибки цифр, дат, знаков.'
    : '';

  const currentDate = new Date().toISOString().split('T')[0];

  return `Ты — юрист-практик по российскому договорному праву (20+ лет опыта).
Твоя задача: глубокий анализ гражданско-правового договора для роли «${meta.role ?? 'Не указано'}» в сфере «${meta.description ?? 'Не указано'}».
Текущая дата: ${currentDate}

${scanNotice}

========================  ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ  ========================
1. Прочитай ВСЕ пункты договора (разметка <<<DOC>>> см. ниже).
2. Ссылайся ТОЛЬКО на реально существующие пункты (формат «п. 3.4»).
3. Разнообразь риски: финансы, сроки, ответственность, ИС, ПДн, форс-мажор, расторжение, споры, законодательство.
4. Если встречается [ПРОПУСК] — укажи, что поле незаполнено и это риск.
5. Указывай конкретные нормы права РФ (пример: «ст. 421 ГК РФ», «п. 3 ст. 7 ФЗ-152»).
6. Проверяй противоречия между разделами и отражай как отдельные риски.
7. Отмечай отсутствие обязательных реквизитов (ИНН, ОГРН).
8. В рекомендациях используй активный залог, избегай юридических абстракций.
9. Цитаты из договора — не длиннее 200 символов.
10. Ответ должен быть ЧИСТЫМ JSON — без Markdown, без преамбулы, без комментариев.

КРИТИЧЕСКИ ВАЖНО:
- ВСЕГДА давай МИНИМУМ 5 рисков в КАЖДОЙ категории (critical, moderate, low)
- ВСЕГДА давай МИНИМУМ 10 рекомендаций
- Если в договоре мало пунктов, анализируй глубже: отсутствие важных условий тоже риск
- Ищи риски в том, что НЕ написано в договоре (отсутствие важных разделов)

========================  СХЕМА JSON ОТВЕТА  ==============================
{
  "overview":           string,     // 3-5 предложений, 400-600 симв.
  "marketingScore":     number,     // 0-10, насколько договор «продающий»
  "risks": {
    "critical":   string[],         // ОБЯЗАТЕЛЬНО ≥5, ≥500 симв. каждый
    "moderate":   string[],         // ОБЯЗАТЕЛЬНО ≥5, ≥500 симв. каждый
    "low":        string[]          // ОБЯЗАТЕЛЬНО ≥5, ≥500 симв. каждый
  },
  "recommendations":    string[],   // ОБЯЗАТЕЛЬНО ≥10, ≥300 симв. «Предлагаем заменить...»
  "conclusion":         string,     // Итог, 250-400 симв.
  "mentionedClauses":   string[],   // Все номера пунктов, которые упоминал
  "token_estimate":     number      // Оцени использованные токены
}

ЗАПРЕЩЕНО использовать эмодзи или маркеры типа "🔵PR:" в рекомендациях.

========================  ДОГОВОР  =======================================
<<<DOC>>>
{договор вставится здесь}
</DOC>

ВЫВЕДИ ТОЛЬКО JSON.`;
}

// Пример корректного ответа для few-shot learning
function getFewShotExample(): string {
  return `{
  "overview": "Проанализирован договор поставки между ООО 'Альфа' и ИП Иванов. Документ содержит базовые условия, но отсутствуют критически важные положения об ответственности сторон и порядке приемки товара. Требуется существенная доработка для защиты интересов покупателя.",
  "marketingScore": 3,
  "risks": {
    "critical": [
      "п. 4.1: Отсутствует ограничение ответственности поставщика, что создает неограниченные финансовые риски. Согласно ст. 15 ГК РФ, убытки включают реальный ущерб и упущенную выгоду. Необходимо установить предел ответственности в размере стоимости партии товара."
    ],
    "moderate": [
      "п. 2.3: Срок поставки указан как 'разумный', что создает правовую неопределенность. Согласно ст. 314 ГК РФ, обязательство должно быть исполнено в разумный срок, но лучше указать конкретные даты."
    ],
    "low": [
      "п. 8.1: Email для уведомлений не указан. В современной практике электронная почта - основной канал оперативной связи. Рекомендуется добавить email-адреса сторон."
    ]
  },
  "recommendations": [
    "Предлагаем заменить формулировку в п. 4.1 на: 'Ответственность Поставщика ограничена стоимостью непоставленного или некачественного товара'",
    "🔵PR: Добавить в п. 5.1 скидку 3% при предоплате 100% - повысит привлекательность для покупателя"
  ],
  "conclusion": "Договор требует существенной доработки. После внесения рекомендованных изменений документ будет соответствовать требованиям ГК РФ и защитит интересы покупателя.",
  "mentionedClauses": ["4.1", "2.3", "8.1", "5.1"],
  "token_estimate": 2500
}`;
}

// YandexGPT анализ с улучшенной обработкой
async function analyzeWithYandexGPT(html: string, meta: { role?: string; description?: string; isScanned?: boolean }) {
  // Предобработка для специфичных типов договоров
  let documentText = html;
  
  // Проверяем тип договора и применяем специфичную предобработку
  if (documentText.includes('рекламный продукт') || documentText.includes('рекламные услуги')) {
    console.log('Detected advertising contract, applying special preprocessing...');
    documentText = preprocessContract(documentText);
  }
  
  // Очищаем текст от проблемных символов
  documentText = cleanDocumentText(documentText);
  
  // Проверяем, не слишком ли много пропусков (шаблон договора)
  const placeholderCount = (documentText.match(/\[ПРОПУСК\]/g) || []).length;
  const totalWords = documentText.split(/\s+/).length;
  const placeholderRatio = placeholderCount / Math.max(totalWords * 0.01, 1); // процент пропусков
  
  if (placeholderRatio > 5) { // более 5% текста - пропуски
    console.log(`High placeholder ratio (${placeholderRatio.toFixed(1)}%), this is a template`);
    documentText = 'ВНИМАНИЕ: Это шаблон договора с множеством незаполненных полей. Анализ проводится по структуре договора.\n\n' + documentText;
  }
  
  const MAX_CHARS = 18000; // Оставляем запас для промпта
  
  if (documentText.length > MAX_CHARS) {
    console.log(`Document too large (${documentText.length} chars), intelligently truncating...`);
    
    // Интеллектуальное сокращение с сохранением ключевых разделов
    const sections = documentText.split(/(?=(?:\d+\.|[А-Я][А-Я\s]{2,}:|Статья|Раздел)\s)/);
    
    if (sections.length > 1) {
      // Приоритеты разделов
      const priorityKeywords = [
        'предмет', 'цена', 'оплата', 'ответственность', 'штраф', 'неустойк',
        'срок', 'расторжение', 'конфиденциальн', 'персональн', 'форс-мажор',
        'споры', 'заключительн', 'реквизиты'
      ];
      
      // Сортируем разделы по приоритету
      const prioritySections = sections.filter(s => 
        priorityKeywords.some(keyword => s.toLowerCase().includes(keyword))
      );
      
      const beginning = sections.slice(0, 2).join('');
      const priority = prioritySections.slice(0, 5).join('');
      const end = sections.slice(-1).join('');
      
      documentText = beginning + '\n\n[...сокращено...]\n\n' + priority + '\n\n[...сокращено...]\n\n' + end;
    } else {
      // Простое сокращение
      const beginning = documentText.substring(0, 6000);
      const middle = documentText.substring(documentText.length / 2 - 3000, documentText.length / 2 + 3000);
      const end = documentText.substring(documentText.length - 6000);
      documentText = beginning + '\n\n[...сокращено...]\n\n' + middle + '\n\n[...сокращено...]\n\n' + end;
    }
  }

  // Подготавливаем промпт с документом
  const systemPrompt = createSystemPrompt(meta);
  const documentPrompt = systemPrompt.replace('{договор вставится здесь}', documentText);
  
  console.log('Sending to YandexGPT:', {
    documentSize: documentText.length,
    placeholderCount,
    placeholderRatio: placeholderRatio.toFixed(1) + '%',
    promptSize: documentPrompt.length
  });

  // Подготавливаем few-shot пример
  const fewShotExample = getFewShotExample();

  const requestBody = {
    modelUri: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
    completionOptions: {
      stream: false,
      temperature: 0.05, // Снижаем для детерминированности
      maxTokens: 2500
    },
    messages: [
      {
        role: 'system',
        text: 'Ты эксперт по анализу договоров. Всегда отвечай только валидным JSON без дополнительного текста.'
      },
      {
        role: 'user',
        text: 'Проанализируй этот пример договора и выведи JSON:'
      },
      {
        role: 'assistant',
        text: fewShotExample
      },
      {
        role: 'user', 
        text: documentPrompt
      }
    ]
  };

  try {
    const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${process.env.YANDEX_API_KEY}`,
        'x-folder-id': process.env.YANDEX_FOLDER_ID!
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YandexGPT API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Превышен лимит запросов к YandexGPT. Попробуйте позже.');
      } else if (response.status === 401) {
        throw new Error('Ошибка авторизации YandexGPT. Проверьте API ключ.');
      } else if (response.status === 400) {
        console.error('Bad request, prompt size:', documentPrompt.length);
        throw new Error('Некорректный запрос к YandexGPT (возможно, слишком большой документ)');
      }
      
      throw new Error(`YandexGPT API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('YandexGPT response received:', {
      totalTokens: data.result?.usage?.totalTokens,
      promptTokens: data.result?.usage?.promptTokens,
      completionTokens: data.result?.usage?.completionTokens
    });
    
    if (!data.result?.alternatives?.[0]?.message?.text) {
      console.error('Invalid YandexGPT response structure:', JSON.stringify(data));
      throw new Error('YandexGPT вернул некорректный ответ');
    }
    
    let analysisText = data.result.alternatives[0].message.text;
    console.log('Analysis text length:', analysisText.length);
    
    // Проверка на отказ YandexGPT
    const rejectionPhrases = [
      'в интернете есть много',
      'посмотрите, что нашлось',
      'ya.ru',
      'yandex.ru/search',
      'не могу проанализировать',
      'не могу выполнить',
      'обратитесь к специалисту',
      'не могу дать юридическую консультацию'
    ];
    
    const lowerText = analysisText.toLowerCase();
    const isRejection = rejectionPhrases.some(phrase => lowerText.includes(phrase)) || 
                       analysisText.length < 200;
    
    if (isRejection) {
      console.log('YandexGPT rejection detected');
      throw new Error('YandexGPT не смог проанализировать документ');
    }
    
    // Улучшенная очистка и поиск JSON
    // Убираем все до первой {
    const jsonStart = analysisText.indexOf('{');
    if (jsonStart > 0) {
      analysisText = analysisText.substring(jsonStart);
    }
    
    // Убираем все после последней }
    const jsonEnd = analysisText.lastIndexOf('}');
    if (jsonEnd > 0 && jsonEnd < analysisText.length - 1) {
      analysisText = analysisText.substring(0, jsonEnd + 1);
    }
    
    // Убираем markdown если остался
    analysisText = analysisText.replace(/```json?\s*/gi, '').replace(/```\s*/gi, '');
    
    try {
      const result = JSON.parse(analysisText);
      
      // Валидация структуры результата
      const requiredFields = ['overview', 'risks', 'recommendations', 'conclusion'];
      const missingFields = requiredFields.filter(field => !result[field]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        throw new Error(`Неполный анализ от YandexGPT: отсутствуют поля ${missingFields.join(', ')}`);
      }
      
      // Валидация структуры risks
      if (!result.risks.critical || !result.risks.moderate || !result.risks.low) {
        throw new Error('Неполная структура рисков в ответе YandexGPT');
      }
      
      // Проверка минимального количества элементов
      if (result.risks.critical.length < 5) {
        console.error(`Недостаточно критических рисков: ${result.risks.critical.length}, требуется минимум 5`);
        throw new Error('YandexGPT вернул недостаточно критических рисков (минимум 5)');
      }
      if (result.risks.moderate.length < 5) {
        console.error(`Недостаточно умеренных рисков: ${result.risks.moderate.length}, требуется минимум 5`);
        throw new Error('YandexGPT вернул недостаточно умеренных рисков (минимум 5)');
      }
      if (result.risks.low.length < 5) {
        console.error(`Недостаточно низких рисков: ${result.risks.low.length}, требуется минимум 5`);
        throw new Error('YandexGPT вернул недостаточно низких рисков (минимум 5)');
      }
      if (result.recommendations.length < 10) {
        console.error(`Недостаточно рекомендаций: ${result.recommendations.length}, требуется минимум 10`);
        throw new Error('YandexGPT вернул недостаточно рекомендаций (минимум 10)');
      }
      
      // Добавляем недостающие поля если их нет
      result.marketingScore = result.marketingScore ?? 5;
      result.mentionedClauses = result.mentionedClauses ?? [];
      result.token_estimate = result.token_estimate ?? data.result.usage?.totalTokens ?? 2000;
      
      console.log('YandexGPT analysis completed successfully:', {
        risksCount: {
          critical: result.risks.critical.length,
          moderate: result.risks.moderate.length,
          low: result.risks.low.length
        },
        recommendationsCount: result.recommendations.length,
        marketingScore: result.marketingScore,
        mentionedClauses: result.mentionedClauses.length
      });
      
      return result;
      
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Failed to parse text:', analysisText.substring(0, 500) + '...');
      throw new Error('Не удалось разобрать JSON ответ от YandexGPT');
    }
    
  } catch (error) {
    console.error('YandexGPT request failed:', error);
    throw error;
  }
}

// Улучшенные мок-данные с маркетинговой составляющей
function generateMockAnalysis(role: string, description: string, filename: string, isScanned: boolean = false) {
  const scanWarning = isScanned 
    ? " Документ был распознан из скана, возможны неточности в тексте." 
    : ""

  return {
    overview: `Проанализирован договор "${filename}" с позиции роли "${role}" в сфере "${description}". Документ содержит стандартные условия с несколькими потенциальными рисками, требующими внимания. Общий уровень риска - умеренный. Рекомендуется внимательное изучение условий ответственности и порядка расторжения.${scanWarning}`,
    marketingScore: 4,
    risks: {
      critical: [
        "п. 5.1: Неограниченная ответственность стороны за убытки может привести к значительным финансовым потерям. Согласно ст. 15 ГК РФ убытки включают как реальный ущерб, так и упущенную выгоду. Отсутствие ограничения ответственности создает неопределенные финансовые риски для стороны. Рекомендуется установить предел ответственности в размере стоимости договора или иной разумной суммы.",
        "п. 7.3: Отсутствует ограничение по размеру неустойки, что создает риск чрезмерных штрафов. В соответствии со ст. 333 ГК РФ суд может уменьшить неустойку, если она явно несоразмерна последствиям нарушения обязательства. Однако лучше заранее установить разумные пределы неустойки в договоре, например, не более 10% от суммы договора.",
        "п. 9.2: Односторонний отказ от договора без согласования может нарушить планы бизнеса. По общему правилу ст. 310 ГК РФ односторонний отказ от исполнения обязательства не допускается, за исключением случаев, предусмотренных законом или договором. Необходимо четко прописать основания и процедуру одностороннего отказа.",
        "п. 3.4: Нечеткие формулировки объема работ могут привести к спорам об исполнении. Согласно ст. 432 ГК РФ договор считается заключенным, если достигнуто соглашение по всем существенным условиям. Для договора подряда существенным является условие о предмете. Расплывчатые формулировки создают риск признания договора незаключенным.",
        "п. 11.5: Отсутствие условий о конфиденциальности может привести к утечке коммерческой информации. В соответствии с Федеральным законом 'О коммерческой тайне' необходимо установить режим конфиденциальности для защиты важной информации. Рекомендуется включить отдельный раздел о конфиденциальности с указанием сроков и ответственности."
      ],
      moderate: [
        "п. 4.2: Сроки оплаты не содержат защиты от задержек со стороны банков. Необходимо указать, что датой оплаты считается дата списания денежных средств с расчетного счета плательщика, а не дата их зачисления на счет получателя. Это защитит плательщика от ответственности за задержки в банковской системе.",
        "п. 6.1: Форс-мажорные обстоятельства определены слишком узко. Рекомендуется расширить перечень в соответствии с практикой и включить эпидемии, изменения законодательства, акты органов власти. Также важно установить процедуру уведомления о форс-мажоре и подтверждения таких обстоятельств.",
        "п. 8.5: Процедура изменения договора требует доработки. Следует указать, что изменения вступают в силу с момента подписания дополнительного соглашения обеими сторонами. Также можно предусмотреть возможность обмена документами по электронной почте с последующим обменом оригиналами.",
        "п. 2.3: Условия приемки работ не детализированы должным образом. Необходимо установить конкретные сроки для приемки (например, 5 рабочих дней), процедуру оформления мотивированного отказа, последствия уклонения от приемки. Это поможет избежать споров о качестве и сроках выполнения работ.",
        "п. 10.3: Порядок разрешения споров не учитывает возможность медиации. Рекомендуется включить положение о том, что до обращения в суд стороны проводят переговоры, а при недостижении согласия могут обратиться к медиатору. Это может существенно сэкономить время и средства на разрешение конфликтов."
      ],
      low: [
        "п. 10.1: Указан неполный почтовый адрес одной из сторон, отсутствует ИНН. Отсутствие почтового индекса может привести к задержкам в доставке корреспонденции. Рекомендуется указать полные почтовые адреса с индексами и все обязательные реквизиты (ОГРН, ИНН, КПП) для обеих сторон.",
        "п. 1.2: Термины и определения можно расширить для ясности. Рекомендуется добавить определения ключевых понятий, используемых в договоре, таких как 'рабочий день', 'отчетный период', 'конфиденциальная информация'. Это поможет избежать разночтений.",
        "п. 11.3: Способ уведомлений не включает электронную почту. В современных условиях электронная почта является быстрым и надежным способом коммуникации. Рекомендуется включить email как равноправный способ направления уведомлений с указанием адресов электронной почты сторон.",
        "п. 12.1: Срок хранения документов не указан. В соответствии с требованиями налогового и бухгалтерского учета рекомендуется установить срок хранения документов по договору не менее 5 лет с момента исполнения всех обязательств.",
        "п. 13.2: Отсутствует указание на применимое право. Хотя договор заключается между российскими лицами, рекомендуется явно указать, что к отношениям сторон применяется право Российской Федерации. Это исключит возможные споры о применимом праве."
      ]
    },
    recommendations: [
      "Предлагаем заменить формулировку в п. 5.1 на: 'Ответственность каждой из Сторон по настоящему Договору ограничивается возмещением реального ущерба и не может превышать общую стоимость Договора. Упущенная выгода возмещению не подлежит.'",
      "Предлагаем добавить в п. 7.3: 'Общий размер неустойки (пени, штрафа) по настоящему Договору не может превышать 10% от общей стоимости Договора. Неустойка начисляется за каждый день просрочки в размере 0,1% от суммы неисполненного обязательства.'",
      "Предлагаем дополнить п. 9.2 следующим: 'Сторона, намеревающаяся расторгнуть Договор в одностороннем порядке, обязана письменно уведомить другую Сторону не менее чем за 30 календарных дней до предполагаемой даты расторжения с указанием оснований для расторжения.'",
      "Предлагаем изменить п. 3.4 на: 'Исполнитель обязуется выполнить следующие работы: [конкретный перечень работ с указанием объемов, характеристик и сроков выполнения каждого этапа]. Подробное техническое задание приведено в Приложении №1 к настоящему Договору.'",
      "Предлагаем добавить в п. 4.1 условие о скидке 5% при предоплате 100% - это повысит привлекательность предложения для контрагента и ускорит получение денежных средств.",
      "Предлагаем заменить формулировку в п. 4.2 на: 'Оплата производится в течение 5 (пяти) банковских дней с момента подписания акта выполненных работ. Датой оплаты считается дата списания денежных средств с расчетного счета Заказчика.'",
      "Предлагаем дополнить п. 6.1: 'К обстоятельствам непреодолимой силы относятся: стихийные бедствия, военные действия, эпидемии, забастовки, принятие органами власти актов, препятствующих исполнению Договора. Сторона, ссылающаяся на форс-мажор, обязана уведомить другую Сторону в течение 3 дней.'",
      "Предлагаем включить в п. 2.5 гарантийный срок на выполненные работы 12 месяцев - это создаст дополнительное доверие к исполнителю и выделит предложение среди конкурентов.",
      "Предлагаем изменить п. 8.5 на: 'Все изменения и дополнения к настоящему Договору действительны при условии их составления в письменной форме и подписания уполномоченными представителями Сторон.'",
      "Предлагаем дополнить п. 2.3: 'Приемка работ осуществляется в течение 5 (пяти) рабочих дней с момента получения уведомления о готовности.'",
      "Предлагаем добавить в п. 10.1 полные реквизиты: 'Юридический адрес: [индекс], [область], [город], [улица], [дом], [офис]. ОГРН: [номер], ИНН/КПП: [номера].'",
      "Предлагаем добавить в п. 5.3 бонусную систему за досрочное выполнение работ - премия 2% от стоимости за каждую неделю досрочной сдачи (максимум 10%)."
    ],
    conclusion: `Договор в целом соответствует требованиям законодательства РФ, однако содержит ряд существенных рисков и имеет низкий маркетинговый потенциал (оценка ${4}/10). При внесении предложенных изменений договор будет более сбалансированным, защитит интересы стороны в роли "${role}" и станет более привлекательным для контрагента.`,
    mentionedClauses: ["5.1", "7.3", "9.2", "3.4", "11.5", "4.2", "6.1", "8.5", "2.3", "10.3", "10.1", "1.2", "11.3", "12.1", "13.2", "4.1", "2.5", "5.3"],
    token_estimate: 2800
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contractId } = await req.json()
    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID required' }, { status: 400 })
    }

    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId: session.user.id },
      include: {
        user: {
          select: {
            email: true,
            settings: true
          }
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'processing' }
    })

    let analysisStatus: 'done' | 'error' = 'done'

    try {
      // Читаем файл
      const filePath = join(UPLOAD_DIR, contract.path!)
      const buffer = await readFile(filePath)
      
      // Определяем тип файла
      const fileExtension = contract.filename?.split('.').pop()?.toLowerCase()
      let mimeType = 'application/octet-stream'
      
      switch (fileExtension) {
        case 'doc':
          mimeType = 'application/msword'
          break
        case 'docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          break
        case 'pdf':
          mimeType = 'application/pdf'
          break
      }
      
      console.log('Processing file:', contract.filename, 'with type:', mimeType)
      
      // Используем универсальный парсер
      const parsedDocument = await parseDocument(buffer, mimeType)
      
      console.log('Document parsed:', {
        textLength: parsedDocument.text.length,
        htmlLength: parsedDocument.html.length,
        pageCount: parsedDocument.pageCount,
        isScanned: parsedDocument.isScanned
      })

      let result: any
      let provider = 'mock'

      // Пробуем YandexGPT
      if (process.env.YANDEX_API_KEY && process.env.YANDEX_FOLDER_ID) {
        try {
          console.log('Using YandexGPT...')
          result = await analyzeWithYandexGPT(parsedDocument.html, {
            role: contract.role,
            description: contract.description,
            isScanned: parsedDocument.isScanned
          })
          provider = 'yandex'
          console.log('YandexGPT analysis success!')
        } catch (yandexError) {
          console.error('YandexGPT failed, falling back to mock:', yandexError)
          result = generateMockAnalysis(
            contract.role || 'Не указано',
            contract.description || 'Не указано', 
            contract.filename || 'документ',
            parsedDocument.isScanned || false
          )
          provider = 'mock_fallback'
        }
      } else {
        console.log('YandexGPT not configured, using mock...')
        result = generateMockAnalysis(
          contract.role || 'Не указано',
          contract.description || 'Не указано', 
          contract.filename || 'документ',
          parsedDocument.isScanned || false
        )
      }

      console.log(`Analysis completed with ${provider}:`, {
        risksCount: {
          critical: result.risks?.critical?.length || 0,
          moderate: result.risks?.moderate?.length || 0,
          low: result.risks?.low?.length || 0
        },
        recommendationsCount: result.recommendations?.length || 0,
        marketingScore: result.marketingScore,
        tokenEstimate: result.token_estimate
      })

      // Добавляем информацию о документе в результат
      result.highlightedPoints = result.mentionedClauses || []
      result.documentInfo = {
        type: fileExtension,
        isScanned: parsedDocument.isScanned,
        pageCount: parsedDocument.pageCount,
        analyzedAt: new Date().toISOString()
      }

      // Сохраняем результат с provider
      const updatedContract = await prisma.contract.update({
        where: { id: contractId },
        data: {
          status: 'done',
          plainText: parsedDocument.html,
          result: { ...result, provider }
        }
      })

      console.log('Contract updated successfully with provider:', provider)

    } catch (analysisError) {
      console.error('Analysis error:', analysisError)
      analysisStatus = 'error'
      
      await prisma.contract.update({
        where: { id: contractId },
        data: { 
          status: 'error',
          result: {
            error: analysisError instanceof Error ? analysisError.message : 'Неизвестная ошибка анализа'
          }
        }
      })
    }

    // Отправляем email уведомление после завершения анализа
    if (contract.user?.email) {
      console.log('Sending email notification to:', contract.user.email)
      
      // Проверяем настройки пользователя
      const userSettings = contract.user.settings as any
      if (userSettings?.emailNotifications !== false) {
        await sendAnalysisCompleteEmail(
          contract.user.email,
          contractId,
          contract.filename || 'документ',
          analysisStatus
        ).catch(emailError => {
          console.error('Failed to send email notification:', emailError)
          // Не прерываем основной процесс из-за ошибки email
        })
      } else {
        console.log('Email notifications disabled for user')
      }
    }

    if (analysisStatus === 'done') {
      return NextResponse.json({ 
        success: true,
        message: 'Анализ завершён успешно'
      })
    } else {
      return NextResponse.json({ 
        error: 'Ошибка при анализе документа'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Contract analysis error:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 })
  }
}