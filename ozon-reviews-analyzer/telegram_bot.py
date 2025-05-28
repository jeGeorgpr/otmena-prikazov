"""
Telegram-бот для анализа отзывов Ozon
"""
import os
import asyncio
import logging
from typing import Dict, Optional
from datetime import datetime
import re

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    ContextTypes,
    filters
)
from telegram.constants import ParseMode

# Импорт основного модуля анализа
from ozon_reviews_analyzer import analyze_product_reviews

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Состояния диалога
WAITING_FOR_PRODUCT, WAITING_FOR_RATING = range(2)

# Эмодзи для красивого вывода
EMOJI = {
    'star': '⭐',
    'chart': '📊',
    'target': '🎯',
    'package': '📦',
    'clock': '⏰',
    'check': '✅',
    'cross': '❌',
    'info': 'ℹ️',
    'warning': '⚠️',
    'rocket': '🚀'
}


class OzonReviewsBot:
    """Класс Telegram-бота"""
    
    def __init__(self, token: str):
        self.token = token
        self.user_sessions: Dict[int, Dict] = {}
        
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Обработчик команды /start"""
        user = update.effective_user
        welcome_text = (
            f"Привет, {user.mention_html()}! {EMOJI['rocket']}\n\n"
            f"Я помогу проанализировать отзывы товаров на Ozon и рассчитать, "
            f"сколько новых 5-звездочных отзывов нужно для достижения целевого рейтинга.\n\n"
            f"{EMOJI['info']} <b>Как пользоваться:</b>\n"
            f"1. Используй команду /analyze\n"
            f"2. Отправь ссылку на товар или артикул\n"
            f"3. Укажи желаемый рейтинг\n\n"
            f"{EMOJI['chart']} <b>Дополнительные команды:</b>\n"
            f"/help - справка\n"
            f"/examples - примеры использования"
        )
        
        keyboard = [
            [InlineKeyboardButton("🔍 Начать анализ", callback_data="start_analyze")],
            [InlineKeyboardButton("📖 Примеры", callback_data="show_examples")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_html(
            welcome_text,
            reply_markup=reply_markup
        )
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Обработчик команды /help"""
        help_text = (
            f"{EMOJI['info']} <b>Справка по боту</b>\n\n"
            f"<b>Что умеет бот:</b>\n"
            f"{EMOJI['check']} Анализировать отзывы товаров Ozon\n"
            f"{EMOJI['check']} Рассчитывать текущий взвешенный рейтинг\n"
            f"{EMOJI['check']} Прогнозировать количество 5★ отзывов для цели\n\n"
            f"<b>Особенности расчета:</b>\n"
            f"• Вес отзыва уменьшается со временем\n"
            f"• Новые отзывы весят больше старых\n"
            f"• Отзывы старше 365 дней не учитываются\n\n"
            f"<b>Формат ввода:</b>\n"
            f"• Полная ссылка на товар\n"
            f"• Артикул (числовой ID)\n"
            f"• Часть ссылки с артикулом"
        )
        
        await update.message.reply_html(help_text)
    
    async def examples_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Показать примеры использования"""
        examples_text = (
            f"{EMOJI['info']} <b>Примеры использования</b>\n\n"
            f"<b>Варианты ввода товара:</b>\n"
            f"• <code>https://www.ozon.ru/product/example-123456789</code>\n"
            f"• <code>123456789</code>\n"
            f"• <code>product/example-123456789</code>\n\n"
            f"<b>Целевой рейтинг:</b>\n"
            f"• Любое число от 1.0 до 5.0\n"
            f"• Например: 4.5, 4.7, 4.85\n\n"
            f"{EMOJI['warning']} <i>Примечание: анализ может занять время, "
            f"так как бот загружает все отзывы товара</i>"
        )
        
        await update.message.reply_html(examples_text)
    
    async def analyze_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Начало процесса анализа"""
        await update.message.reply_text(
            f"{EMOJI['package']} Отправьте ссылку на товар Ozon или артикул:\n\n"
            f"<i>Например: https://www.ozon.ru/product/...</i>",
            parse_mode=ParseMode.HTML
        )
        
        return WAITING_FOR_PRODUCT
    
    async def receive_product(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Получение ссылки на товар"""
        user_id = update.effective_user.id
        product_input = update.message.text.strip()
        
        # Сохраняем в контексте
        context.user_data['product_input'] = product_input
        
        # Создаем клавиатуру с популярными целевыми рейтингами
        keyboard = [
            [
                InlineKeyboardButton("4.0", callback_data="rating_4.0"),
                InlineKeyboardButton("4.2", callback_data="rating_4.2"),
                InlineKeyboardButton("4.5", callback_data="rating_4.5")
            ],
            [
                InlineKeyboardButton("4.6", callback_data="rating_4.6"),
                InlineKeyboardButton("4.7", callback_data="rating_4.7"),
                InlineKeyboardButton("4.8", callback_data="rating_4.8")
            ],
            [
                InlineKeyboardButton("Ввести другое значение", callback_data="rating_custom")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            f"{EMOJI['target']} Выберите целевой рейтинг или введите свой:",
            reply_markup=reply_markup
        )
        
        return WAITING_FOR_RATING
    
    async def button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Обработка нажатий на кнопки"""
        query = update.callback_query
        await query.answer()
        
        if query.data == "start_analyze":
            await query.message.reply_text(
                f"{EMOJI['package']} Отправьте ссылку на товар Ozon или артикул:",
                parse_mode=ParseMode.HTML
            )
            return WAITING_FOR_PRODUCT
            
        elif query.data == "show_examples":
            examples_text = (
                f"{EMOJI['info']} <b>Примеры использования</b>\n\n"
                f"<b>Варианты ввода товара:</b>\n"
                f"• <code>https://www.ozon.ru/product/example-123456789</code>\n"
                f"• <code>123456789</code>\n"
                f"• <code>product/example-123456789</code>\n\n"
                f"<b>Целевой рейтинг:</b>\n"
                f"• Любое число от 1.0 до 5.0\n"
                f"• Например: 4.5, 4.7, 4.85"
            )
            await query.message.reply_html(examples_text)
            return ConversationHandler.END
            
        elif query.data.startswith("rating_"):
            rating_value = query.data.replace("rating_", "")
            
            if rating_value == "custom":
                await query.message.reply_text(
                    f"{EMOJI['target']} Введите желаемый рейтинг (от 1.0 до 5.0):"
                )
                return WAITING_FOR_RATING
            else:
                context.user_data['target_rating'] = float(rating_value)
                await self.perform_analysis(query.message, context)
                return ConversationHandler.END
    
    async def receive_rating(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Получение целевого рейтинга"""
        try:
            rating = float(update.message.text.strip().replace(',', '.'))
            
            if not 1.0 <= rating <= 5.0:
                await update.message.reply_text(
                    f"{EMOJI['warning']} Рейтинг должен быть от 1.0 до 5.0. Попробуйте еще раз:"
                )
                return WAITING_FOR_RATING
            
            context.user_data['target_rating'] = rating
            await self.perform_analysis(update.message, context)
            return ConversationHandler.END
            
        except ValueError:
            await update.message.reply_text(
                f"{EMOJI['warning']} Неверный формат. Введите число от 1.0 до 5.0:"
            )
            return WAITING_FOR_RATING
    
    async def perform_analysis(self, message, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Выполнение анализа"""
        product_input = context.user_data.get('product_input')
        target_rating = context.user_data.get('target_rating')
        
        # Отправляем сообщение о начале анализа
        progress_msg = await message.reply_text(
            f"{EMOJI['clock']} Анализирую отзывы товара...\n"
            f"<i>Это может занять 1-2 минуты</i>",
            parse_mode=ParseMode.HTML
        )
        
        try:
            # Выполняем анализ
            result = await analyze_product_reviews(product_input, target_rating)
            
            # Форматируем результат
            stats = result['statistics']
            rating_dist = stats['rating_distribution']
            
            # Создаем визуализацию распределения оценок
            rating_bars = ""
            max_count = max(rating_dist.values()) if rating_dist else 1
            
            for rating in range(5, 0, -1):
                count = rating_dist.get(rating, 0)
                bar_length = int((count / max_count) * 20) if max_count > 0 else 0
                bar = "█" * bar_length + "░" * (20 - bar_length)
                rating_bars += f"{rating}★ {bar} {count}\n"
            
            # Формируем ответ
            response_text = (
                f"{EMOJI['chart']} <b>Анализ завершен!</b>\n\n"
                f"{EMOJI['package']} <b>Товар:</b> <code>{result['product_id']}</code>\n"
                f"{EMOJI['star']} <b>Текущий рейтинг:</b> {result['current_rating']:.2f}\n"
                f"{EMOJI['target']} <b>Целевой рейтинг:</b> {result['target_rating']}\n\n"
                f"{EMOJI['rocket']} <b>Результат:</b>\n"
            )
            
            if result['required_5star_reviews'] == 0:
                response_text += f"{EMOJI['check']} Целевой рейтинг уже достигнут!\n\n"
            else:
                response_text += (
                    f"Необходимо получить <b>{result['required_5star_reviews']}</b> "
                    f"новых 5-звездочных отзывов\n\n"
                )
            
            response_text += (
                f"{EMOJI['info']} <b>Статистика:</b>\n"
                f"• Всего отзывов: {stats['total_reviews']}\n"
                f"• Активных отзывов: {stats['active_reviews']}\n"
                f"• Средний возраст: {stats['average_age_days']:.0f} дней\n"
                f"• Суммарный вес: {result['total_weight']:.2f}\n\n"
                f"<b>Распределение оценок:</b>\n"
                f"<pre>{rating_bars}</pre>"
            )
            
            # Удаляем сообщение о прогрессе
            await progress_msg.delete()
            
            # Отправляем результат
            await message.reply_html(response_text)
            
            # Добавляем ссылку на товар
            product_url = f"https://www.ozon.ru/product/{result['product_id']}"
            await message.reply_text(
                f"🔗 <a href='{product_url}'>Открыть товар на Ozon</a>",
                parse_mode=ParseMode.HTML,
                disable_web_page_preview=True
            )
            
        except Exception as e:
            await progress_msg.delete()
            error_text = (
                f"{EMOJI['cross']} <b>Ошибка при анализе:</b>\n"
                f"<i>{str(e)}</i>\n\n"
                f"Проверьте правильность ссылки или артикула и попробуйте снова."
            )
            await message.reply_html(error_text)
    
    async def cancel(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
        """Отмена текущей операции"""
        await update.message.reply_text(
            f"{EMOJI['info']} Операция отменена. Используйте /analyze для нового анализа."
        )
        return ConversationHandler.END
    
    async def error_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Обработка ошибок"""
        logger.error(f"Update {update} caused error {context.error}")
        
        if update and update.effective_message:
            await update.effective_message.reply_text(
                f"{EMOJI['warning']} Произошла ошибка. Попробуйте позже или обратитесь к администратору."
            )
    
    def run(self):
        """Запуск бота"""
        # Создаем приложение
        application = Application.builder().token(self.token).build()
        
        # Создаем обработчик диалога
        conv_handler = ConversationHandler(
            entry_points=[
                CommandHandler("analyze", self.analyze_command),
                CallbackQueryHandler(self.button_callback, pattern="^start_analyze$")
            ],
            states={
                WAITING_FOR_PRODUCT: [
                    MessageHandler(filters.TEXT & ~filters.COMMAND, self.receive_product)
                ],
                WAITING_FOR_RATING: [
                    MessageHandler(filters.TEXT & ~filters.COMMAND, self.receive_rating),
                    CallbackQueryHandler(self.button_callback, pattern="^rating_")
                ]
            },
            fallbacks=[CommandHandler("cancel", self.cancel)]
        )
        
        # Регистрируем обработчики
        application.add_handler(CommandHandler("start", self.start))
        application.add_handler(CommandHandler("help", self.help_command))
        application.add_handler(CommandHandler("examples", self.examples_command))
        application.add_handler(conv_handler)
        application.add_handler(CallbackQueryHandler(self.button_callback))
        
        # Обработчик ошибок
        application.add_error_handler(self.error_handler)
        
        # Запускаем бота
        logger.info("Бот запущен!")
        application.run_polling(allowed_updates=Update.ALL_TYPES)


def main():
    """Точка входа"""
    # Получаем токен из переменной окружения
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not token:
        logger.error("Не найден токен бота! Установите переменную окружения TELEGRAM_BOT_TOKEN")
        return
    
    # Создаем и запускаем бота
    bot = OzonReviewsBot(token)
    bot.run()


if __name__ == "__main__":
    main()