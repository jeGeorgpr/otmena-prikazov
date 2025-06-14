// components/dashboard/UnifiedUploadForm.tsx
'use client'

import { useState, useRef } from 'react'
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface UploadFormProps {
  onStepComplete: (contractId: number) => void
}

const ROLES = [
  'Заказчик',
  'Исполнитель', 
  'Покупатель',
  'Продавец',
  'Поставщик',
  'Подрядчик',
  'Агент',
  'Арендатор',
  'Арендодатель',
  'Другое'
] as const

const ACCEPTED_TYPES = {
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/pdf': '.pdf'
} as const

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function UnifiedUploadForm({ onStepComplete }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [role, setRole] = useState('')
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string[] => {
    const errors: string[] = []
    
  if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
  errors.push('Поддерживаются только файлы .docx и .pdf')
}
    
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`Размер файла не должен превышать ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }
    
    if (file.size === 0) {
      errors.push('Файл пустой')
    }
    
    return errors
  }

  const handleFileSelect = (selectedFile: File) => {
    const fileErrors = validateFile(selectedFile)
    
    if (fileErrors.length > 0) {
      setErrors(fileErrors)
      return
    }
    
    setErrors([])
    setFile(selectedFile)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleUpload = async () => {
    if (!file || !role) {
      setErrors(['Выберите файл и укажите вашу роль в договоре'])
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('role', role)
    formData.append('description', description)

    try {
      // Симуляция прогресса загрузки
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 20
        })
      }, 200)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки файла')
      }

      const data = await response.json()
      
      setTimeout(() => {
        onStepComplete(data.contractId)
      }, 500)

    } catch (error) {
      console.error('Upload error:', error)
      setErrors([error instanceof Error ? error.message : 'Произошла ошибка при загрузке файла'])
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const removeFile = () => {
    setFile(null)
    setErrors([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isFormValid = file && role && errors.length === 0

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Описание деятельности */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Описание деятельности вашей компании
        </Label>
        <Textarea
          id="description"
          placeholder="Например: разработка программного обеспечения, поставка продуктов питания, консалтинговые услуги..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">
          Эта информация поможет AI лучше проанализировать договор с точки зрения вашего бизнеса
        </p>
      </div>

      {/* Выбор роли */}
      <div className="space-y-2">
        <Label htmlFor="role" className="text-sm font-medium">
          Ваша роль в договоре <span className="text-red-500">*</span>
        </Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите вашу роль" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((roleOption) => (
              <SelectItem key={roleOption} value={roleOption}>
                {roleOption}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          AI проанализирует договор с точки зрения выбранной роли
        </p>
      </div>

      {/* Загрузка файла */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Файл договора <span className="text-red-500">*</span>
        </Label>
        <div
          className={cn(
            "relative rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragActive && "border-primary bg-primary/5",
            file && "border-green-300 bg-green-50",
            errors.length > 0 && "border-red-300 bg-red-50",
            !file && !dragActive && !errors.length && "border-gray-300 hover:border-gray-400"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept={Object.values(ACCEPTED_TYPES).join(',')}
            onChange={handleInputChange}
            disabled={isUploading}
          />

          {!file ? (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <button
                  type="button"
                  className="font-semibold text-primary hover:text-primary/80"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  Выберите файл
                </button>
                <span className="text-gray-600"> или перетащите сюда</span>
              </div>
                <p className="mt-2 text-xs text-gray-500">
                  DOCX, PDF до {MAX_FILE_SIZE / 1024 / 1024}MB
                </p>
            </>
          ) : (
            <div className="flex items-center justify-center space-x-3">
              <File className="h-8 w-8 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && (
                <button
                  onClick={removeFile}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ошибки */}
      {errors.length > 0 && (
        <div className="flex items-start space-x-2 rounded-md bg-red-50 p-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            {errors.map((error, index) => (
              <p key={index}>{error}</p>
            ))}
          </div>
        </div>
      )}

      {/* Прогресс загрузки */}
      {isUploading && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Загрузка файла...</span>
            <span className="font-medium">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Кнопка отправки */}
      <Button
        onClick={handleUpload}
        disabled={!isFormValid || isUploading}
        className="w-full"
        size="lg"
      >
        {isUploading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
            Загрузка...
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 mr-2" />
            Получить результат
          </>
        )}
      </Button>

      {/* Сообщение об успехе */}
      {uploadProgress === 100 && !isUploading && (
        <div className="flex items-center space-x-2 rounded-md bg-green-50 p-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-700">Файл успешно загружен!</p>
        </div>
      )}
    </div>
  )
}