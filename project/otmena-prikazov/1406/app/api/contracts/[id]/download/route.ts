import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readUploadedFile } from '@/utils/fileUtils'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contractId = parseInt(params.id)
    if (isNaN(contractId)) {
      return NextResponse.json({ error: 'Invalid contract ID' }, { status: 400 })
    }

    // Получаем контракт
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        userId: session.user.id
      }
    })

    if (!contract || !contract.path) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Читаем файл
    const fileBuffer = await readUploadedFile(contract.path)

    // Определяем MIME тип
    const ext = contract.filename?.split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case 'doc':
        contentType = 'application/msword'
        break
      case 'docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        break
      case 'pdf':
        contentType = 'application/pdf'
        break
    }

    // Возвращаем файл
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${contract.filename || 'document'}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}