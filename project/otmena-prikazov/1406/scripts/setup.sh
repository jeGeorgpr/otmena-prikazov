#!/bin/bash

echo "🚀 Настройка проекта imYrist..."

# Проверяем наличие .env файла
if [ ! -f .env.local ]; then
    echo "📝 Создаем .env.local файл..."
    cp .env.example .env.local
    echo "⚠️  Пожалуйста, отредактируйте .env.local и добавьте ваши настройки"
    echo ""
fi

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# Генерируем Prisma Client
echo "🔧 Генерируем Prisma Client..."
npx prisma generate

# Создаем директорию для загрузок
echo "📁 Создаем директорию для загрузок..."
mkdir -p uploads

# Генерируем секретный ключ для NextAuth если его нет
if ! grep -q "NEXTAUTH_SECRET=" .env.local || grep -q "NEXTAUTH_SECRET=\"\"" .env.local || grep -q "NEXTAUTH_SECRET=your-secret-key" .env.local; then
    echo "🔐 Генерируем NEXTAUTH_SECRET..."
    SECRET=$(openssl rand -base64 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$SECRET\"/" .env.local
    else
        # Linux
        sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$SECRET\"/" .env.local
    fi
fi

echo ""
echo "✅ Базовая настройка завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Отредактируйте .env.local и добавьте:"
echo "   - DATABASE_URL (строка подключения к PostgreSQL)"
echo "   - SMTP настройки для отправки email"
echo "   - OPENAI_API_KEY для анализа документов"
echo ""
echo "2. Создайте базу данных PostgreSQL"
echo ""
echo "3. Примените миграции:"
echo "   npx prisma db push"
echo ""
echo "4. Запустите проект:"
echo "   npm run dev"
echo ""