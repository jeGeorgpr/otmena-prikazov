// lib/payments/tbank.ts
import axios from 'axios'
import crypto from 'crypto'

const TBANK_API_URL = 'https://securepay.tinkoff.ru/v2'

interface TBankConfig {
  terminal: string
  password: string
}

class TBankAPI {
  private config: TBankConfig

  constructor(config: TBankConfig) {
    this.config = config
  }

  // Генерация токена для подписи запроса
private generateToken(params: Record<string, any>): string {
  // Создаем копию параметров
  const allParams: any = {
    ...params,
    TerminalKey: this.config.terminal,
    Password: this.config.password
  }

  // Удаляем Receipt и DATA для подписи (если они есть)
  if ('Receipt' in allParams) {
    delete allParams.Receipt
  }
  if ('DATA' in allParams) {
    delete allParams.DATA
  }

  // Сортируем ключи и конкатенируем значения
  const sortedKeys = Object.keys(allParams).sort()
  const values = sortedKeys.map(key => allParams[key]).join('')
  
  // Генерируем SHA-256 хеш
  return crypto.createHash('sha256').update(values).digest('hex')
}

  // Инициализация платежа
  async init(params: {
    Amount: number
    OrderId: string
    Description?: string
    CustomerKey?: string
    DATA?: Record<string, string>
    Receipt?: any
  }) {
    const requestData = {
      TerminalKey: this.config.terminal,
      Amount: params.Amount,
      OrderId: params.OrderId,
      Description: params.Description,
      CustomerKey: params.CustomerKey,
      DATA: params.DATA,
      Receipt: params.Receipt
    }

    // Добавляем токен
    requestData['Token'] = this.generateToken(requestData)

    try {
      const response = await axios.post(`${TBANK_API_URL}/Init`, requestData)
      return response.data
    } catch (error) {
      console.error('TBank Init error:', error.response?.data || error.message)
      throw error
    }
  }

  // Проверка статуса платежа
  async getState(params: { PaymentId: string }) {
    const requestData = {
      TerminalKey: this.config.terminal,
      PaymentId: params.PaymentId
    }

    requestData['Token'] = this.generateToken(requestData)

    try {
      const response = await axios.post(`${TBANK_API_URL}/GetState`, requestData)
      return response.data
    } catch (error) {
      console.error('TBank GetState error:', error.response?.data || error.message)
      throw error
    }
  }

  // Отмена платежа
  async cancel(params: { PaymentId: string; Amount?: number }) {
    const requestData = {
      TerminalKey: this.config.terminal,
      PaymentId: params.PaymentId,
      Amount: params.Amount
    }

    requestData['Token'] = this.generateToken(requestData)

    try {
      const response = await axios.post(`${TBANK_API_URL}/Cancel`, requestData)
      return response.data
    } catch (error) {
      console.error('TBank Cancel error:', error.response?.data || error.message)
      throw error
    }
  }
}

// Создаем экземпляр API
const bank = new TBankAPI({
  terminal: process.env.TBANK_TERMINAL_KEY!,
  password: process.env.TBANK_SECRET_KEY!
})

export interface PaymentData {
  orderId: string
  amount: number // в рублях
  email: string
  description?: string
  userId: string
  contractId: number
}

/**
 * Создание платежа
 */
export async function createPayment(data: PaymentData) {
  try {
    const response = await bank.init({
      Amount: data.amount * 100, // конвертируем в копейки
      OrderId: data.orderId,
      Description: data.description || `Анализ договора #${data.contractId}`,
      CustomerKey: data.userId,
      DATA: {
        Email: data.email,
        ContractId: data.contractId.toString(),
      },
      Receipt: {
        Email: data.email,
        Taxation: 'usn_income',
        Items: [{
          Name: 'AI-анализ договора',
          Price: data.amount * 100,
          Quantity: 1,
          Amount: data.amount * 100,
          Tax: 'none',
          PaymentMethod: 'full_payment',
          PaymentObject: 'service'
        }]
      }
    })

    return {
      success: true,
      paymentId: response.PaymentId,
      paymentUrl: response.PaymentURL,
      status: response.Status
    }
  } catch (error) {
    console.error('Payment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка создания платежа'
    }
  }
}

/**
 * Проверка статуса платежа
 */
export async function checkPaymentStatus(paymentId: string) {
  try {
    const response = await bank.getState({
      PaymentId: paymentId
    })

    return {
      success: true,
      status: response.Status,
      amount: response.Amount / 100 // конвертируем обратно в рубли
    }
  } catch (error) {
    console.error('Status check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка проверки статуса'
    }
  }
}

/**
 * Отмена платежа
 */
export async function cancelPayment(paymentId: string, amount?: number) {
  try {
    const response = await bank.cancel({
      PaymentId: paymentId,
      Amount: amount ? amount * 100 : undefined
    })

    return {
      success: true,
      status: response.Status
    }
  } catch (error) {
    console.error('Cancel error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка отмены платежа'
    }
  }
}

/**
 * Валидация уведомления от банка
 */
export function validateNotification(body: any, secretKey: string): boolean {
  const { Token, ...params } = body
  
  // Удаляем поля, которые не участвуют в подписи
  const filteredParams = { ...params }
  delete filteredParams.Receipt
  delete filteredParams.DATA
  
  // Добавляем Password
  filteredParams.Password = secretKey
  
  // Сортируем и конкатенируем
  const sortedKeys = Object.keys(filteredParams).sort()
  const values = sortedKeys.map(key => filteredParams[key]).join('')
  
  // Генерируем хеш
  const calculatedToken = crypto.createHash('sha256').update(values).digest('hex')
  
  return calculatedToken === Token
}