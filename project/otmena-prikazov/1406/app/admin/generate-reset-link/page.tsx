// app/admin/generate-reset-link/page.tsx
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function GenerateResetLink() {
  const { data: session } = useSession()
  const [email, setEmail] = useState('')
  const [resetLink, setResetLink] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!session?.user?.isAdmin) {
    return <div>Доступ запрещен</div>
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const res = await fetch('/api/admin/generate-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await res.json()
      
      if (res.ok && data.resetLink) {
        setResetLink(data.resetLink)
      } else {
        setResetLink('')
        alert(data.error || 'Ошибка')
      }
    } catch (error) {
      alert('Ошибка при генерации ссылки')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6">
      <h1 className="text-2xl font-bold mb-6">Генерация ссылки восстановления</h1>
      
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Email пользователя
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Генерация...' : 'Сгенерировать ссылку'}
        </button>
      </form>
      
      {resetLink && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="font-medium mb-2">Ссылка для восстановления:</p>
          <div className="bg-white p-3 rounded border break-all text-sm">
            {resetLink}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Отправьте эту ссылку пользователю через любой удобный канал связи
          </p>
        </div>
      )}
    </div>
  )
}