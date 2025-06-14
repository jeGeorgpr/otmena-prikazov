-- Создание базы данных (если не существует)
-- CREATE DATABASE imyrist;

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT UNIQUE NOT NULL,
  "emailVerified" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Таблица аккаунтов (для NextAuth)
CREATE TABLE IF NOT EXISTS "Account" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, "providerAccountId")
);

-- Таблица сессий
CREATE TABLE IF NOT EXISTS "Session" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);

-- Таблица токенов верификации
CREATE TABLE IF NOT EXISTS "VerificationToken" (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Таблица контрактов
CREATE TABLE IF NOT EXISTS "Contract" (
  id SERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  filename TEXT,
  path TEXT,
  status TEXT DEFAULT 'uploaded',
  role TEXT,
  description TEXT,
  "plainText" TEXT,
  result JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON "Contract"("userId");
CREATE INDEX IF NOT EXISTS idx_contracts_status ON "Contract"(status);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON "Account"("userId");
CREATE INDEX IF NOT EXISTS idx_session_user_id ON "Session"("userId");

-- Функция для автоматического обновления updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updatedAt
CREATE TRIGGER update_contract_updated_at BEFORE UPDATE ON "Contract"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();