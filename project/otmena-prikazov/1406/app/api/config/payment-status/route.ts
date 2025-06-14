import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Хардкодим для тестирования
  const isPaymentEnabled = true
  
  return NextResponse.json({
    enabled: isPaymentEnabled,
    provider: 'tbank'
  })
}