// types/next-auth.d.ts
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isAdmin: boolean
    } & DefaultSession['user']
  }

  interface User {
    id: string
    email: string
    isAdmin: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    isAdmin: boolean
  }
}

// types/email.d.ts
export interface EmailSettings {
  emailNotifications: boolean
  autoDeleteDocs: boolean
  deleteAfterDays: number
}

export interface EmailTemplate {
  subject: string
  html: string
}

export interface DocumentExpirationInfo {
  filename: string
  daysLeft: number
}
