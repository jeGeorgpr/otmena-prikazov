# Инструкция по деплою ImYrist

## Требования к серверу
- Ubuntu 20.04+ или Debian 10+
- Node.js 18+ 
- PostgreSQL 13+
- Nginx
- PM2 (опционально)
- Git

## Шаг 1: Подготовка сервера

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Устанавливаем PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Устанавливаем Nginx
sudo apt install -y nginx

# Устанавливаем PM2 глобально
sudo npm install -g pm2

# Устанавливаем git
sudo apt install -y git
```

## Шаг 2: Настройка PostgreSQL

```bash
# Входим под postgres
sudo -u postgres psql

# Создаем базу данных и пользователя
CREATE DATABASE imyrist;
CREATE USER imyrist_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE imyrist TO imyrist_user;
\q
```

## Шаг 3: Клонирование проекта

```bash
# Создаем директорию
sudo mkdir -p /var/www/imyrist
sudo chown $USER:$USER /var/www/imyrist

# Клонируем репозиторий
cd /var/www
git clone https://github.com/yourusername/imyrist.git
cd imyrist
```

## Шаг 4: Настройка приложения

```bash
# Копируем и настраиваем .env
cp .env.example .env.production
nano .env.production

# Устанавливаем зависимости
npm ci --production=false

# Генерируем Prisma Client
npx prisma generate

# Применяем миграции
npx prisma db push

# Создаем необходимые директории
mkdir -p uploads logs

# Собираем приложение
npm run build
```

## Шаг 5: Настройка Nginx

```bash
# Копируем конфигурацию
sudo cp nginx/imyrist.conf /etc/nginx/sites-available/imyrist
sudo ln -s /etc/nginx/sites-available/imyrist /etc/nginx/sites-enabled/

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl restart nginx
```

## Шаг 6: Получение SSL сертификата

```bash
# Устанавливаем Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получаем сертификат
sudo certbot --nginx -d imyrist.ru -d www.imyrist.ru
```

## Шаг 7: Запуск приложения

### Вариант A: Через PM2 (рекомендуется)

```bash
# Запускаем через PM2
pm2 start ecosystem.config.js

# Сохраняем конфигурацию PM2
pm2 save

# Настраиваем автозапуск
pm2 startup systemd
# Выполните команду, которую выведет PM2
```

### Вариант B: Через systemd

```bash
# Копируем service файл
sudo cp systemd/imyrist.service /etc/systemd/system/

# Перезагружаем systemd
sudo systemctl daemon-reload

# Запускаем сервис
sudo systemctl start imyrist

# Включаем автозапуск
sudo systemctl enable imyrist

# Проверяем статус
sudo systemctl status imyrist
```

## Шаг 8: Настройка файрвола

```bash
# Разрешаем SSH, HTTP и HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Обновление приложения

```bash
cd /var/www/imyrist

# Останавливаем приложение
pm2 stop imyrist
# или
sudo systemctl stop imyrist

# Получаем последние изменения
git pull

# Устанавливаем зависимости
npm ci --production=false

# Применяем миграции БД
npx prisma db push

# Собираем приложение
npm run build

# Запускаем приложение
pm2 start imyrist
# или
sudo systemctl start imyrist
```

## Мониторинг

### PM2
```bash
# Просмотр логов
pm2 logs imyrist

# Мониторинг в реальном времени
pm2 monit

# Статус процессов
pm2 status
```

### Systemd
```bash
# Просмотр логов
sudo journalctl -u imyrist -f

# Статус сервиса
sudo systemctl status imyrist
```

## Бэкапы

Создайте cron задачу для регулярных бэкапов:

```bash
# Редактируем crontab
crontab -e

# Добавляем задачу (ежедневный бэкап в 3:00)
0 3 * * * pg_dump imyrist > /backup/imyrist_$(date +\%Y\%m\%d).sql
```

## Проблемы и решения

### Ошибка "EADDRINUSE"
Порт 3000 уже занят. Найдите процесс:
```bash
sudo lsof -i :3000
kill -9 <PID>
```

### Ошибки Prisma
```bash
# Пересоздайте Prisma Client
npx prisma generate
```

### Проблемы с правами доступа
```bash
# Установите правильные права на директории
sudo chown -R www-data:www-data /var/www/imyrist/uploads
sudo chmod -R 755 /var/www/imyrist/uploads
```