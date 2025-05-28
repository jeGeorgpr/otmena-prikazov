"""
Модуль для анализа отзывов Ozon с учетом временной регрессии
"""
import asyncio
import re
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from math import ceil
import logging

from playwright.async_api import async_playwright, Page
from bs4 import BeautifulSoup
import json

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class Review:
    """Модель отзыва"""
    rating: int
    date: datetime
    text: Optional[str] = None
    
    @property
    def age_days(self) -> int:
        """Возраст отзыва в днях"""
        return (datetime.now() - self.date).days
    
    @property
    def weight(self) -> float:
        """Вес отзыва с учетом временной регрессии"""
        return max(0, 1 - self.age_days / 365)


class OzonReviewsParser:
    """Парсер отзывов Ozon"""
    
    def __init__(self):
        self.browser = None
        self.page = None
        
    async def __aenter__(self):
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        self.page = await self.browser.new_page()
        await self.page.set_viewport_size({"width": 1920, "height": 1080})
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.browser:
            await self.browser.close()
    
    def extract_product_id(self, url_or_id: str) -> str:
        """Извлечение ID товара из URL или артикула"""
        # Если это уже артикул
        if url_or_id.isdigit():
            return url_or_id
            
        # Извлечение из URL
        match = re.search(r'/product/[^/]+/(\d+)', url_or_id)
        if match:
            return match.group(1)
        
        # Попытка найти числовой ID в строке
        match = re.search(r'(\d{6,})', url_or_id)
        if match:
            return match.group(1)
            
        raise ValueError(f"Не удалось извлечь ID товара из: {url_or_id}")
    
    async def load_reviews_page(self, product_id: str) -> None:
        """Загрузка страницы с отзывами"""
        url = f"https://www.ozon.ru/product/{product_id}/reviews"
        logger.info(f"Загрузка страницы: {url}")
        
        await self.page.goto(url, wait_until='networkidle')
        await asyncio.sleep(2)  # Ждем загрузки динамического контента
        
    async def scroll_to_load_all_reviews(self, max_scrolls: int = 50) -> None:
        """Прокрутка страницы для загрузки всех отзывов"""
        logger.info("Начинаем прокрутку для загрузки отзывов...")
        
        last_height = await self.page.evaluate("document.body.scrollHeight")
        scrolls = 0
        
        while scrolls < max_scrolls:
            # Прокручиваем вниз
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await asyncio.sleep(1.5)
            
            # Проверяем, появились ли новые элементы
            new_height = await self.page.evaluate("document.body.scrollHeight")
            
            if new_height == last_height:
                # Проверяем наличие кнопки "Показать еще"
                show_more = await self.page.query_selector('[data-widget="webReviewProductScore"] button:has-text("Показать еще")')
                if show_more:
                    await show_more.click()
                    await asyncio.sleep(1)
                else:
                    break
                    
            last_height = new_height
            scrolls += 1
            
            if scrolls % 10 == 0:
                logger.info(f"Выполнено {scrolls} прокруток...")
    
    def parse_date(self, date_str: str) -> datetime:
        """Парсинг даты отзыва"""
        date_str = date_str.strip()
        
        # Обработка относительных дат
        if "сегодня" in date_str.lower():
            return datetime.now()
        elif "вчера" in date_str.lower():
            return datetime.now() - timedelta(days=1)
        elif "дней назад" in date_str or "день назад" in date_str or "дня назад" in date_str:
            days = int(re.search(r'(\d+)', date_str).group(1))
            return datetime.now() - timedelta(days=days)
        elif "месяц назад" in date_str or "месяца назад" in date_str or "месяцев назад" in date_str:
            months = 1
            match = re.search(r'(\d+)', date_str)
            if match:
                months = int(match.group(1))
            return datetime.now() - timedelta(days=months * 30)
        elif "год назад" in date_str or "года назад" in date_str or "лет назад" in date_str:
            years = 1
            match = re.search(r'(\d+)', date_str)
            if match:
                years = int(match.group(1))
            return datetime.now() - timedelta(days=years * 365)
        else:
            # Парсинг абсолютной даты
            months = {
                'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4,
                'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8,
                'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12
            }
            
            # Пробуем найти паттерн "день месяц год"
            for month_name, month_num in months.items():
                if month_name in date_str:
                    match = re.search(rf'(\d+)\s+{month_name}(?:\s+(\d{{4}}))?', date_str)
                    if match:
                        day = int(match.group(1))
                        year = int(match.group(2)) if match.group(2) else datetime.now().year
                        return datetime(year, month_num, day)
            
            # Если не удалось распарсить, возвращаем текущую дату
            logger.warning(f"Не удалось распарсить дату: {date_str}")
            return datetime.now()
    
    async def extract_reviews(self) -> List[Review]:
        """Извлечение отзывов со страницы"""
        await self.scroll_to_load_all_reviews()
        
        # Получаем HTML страницы
        content = await self.page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
        reviews = []
        
        # Ищем контейнеры отзывов
        review_containers = soup.find_all('div', {'data-widget': 'webSingleProductScore'})
        
        if not review_containers:
            # Альтернативный селектор
            review_containers = soup.find_all('div', class_=re.compile(r'tsBodyM.*commentCard'))
        
        logger.info(f"Найдено контейнеров отзывов: {len(review_containers)}")
        
        for container in review_containers:
            try:
                # Извлекаем рейтинг
                stars = container.find_all('svg', class_=re.compile(r'star.*fill'))
                if not stars:
                    stars = container.find_all('use', href=re.compile(r'#star'))
                rating = len([s for s in stars if 'fill' in str(s.get('class', ''))])
                
                if rating == 0:
                    # Альтернативный способ
                    rating_elem = container.find('div', class_=re.compile(r'star'))
                    if rating_elem:
                        rating = len(rating_elem.find_all('svg', class_=re.compile(r'fill')))
                
                # Извлекаем дату
                date_elem = container.find('span', class_=re.compile(r'tsBodyS.*color--secondary'))
                if not date_elem:
                    date_elem = container.find('div', class_=re.compile(r'date'))
                
                if date_elem:
                    date_str = date_elem.text.strip()
                    review_date = self.parse_date(date_str)
                    
                    # Извлекаем текст (опционально)
                    text_elem = container.find('span', class_=re.compile(r'tsBodyM'))
                    text = text_elem.text.strip() if text_elem else None
                    
                    if rating > 0:
                        reviews.append(Review(
                            rating=rating,
                            date=review_date,
                            text=text
                        ))
                
            except Exception as e:
                logger.error(f"Ошибка при парсинге отзыва: {e}")
                continue
        
        logger.info(f"Успешно извлечено отзывов: {len(reviews)}")
        return reviews


class ReviewsAnalyzer:
    """Анализатор отзывов с расчетом рейтинга и прогнозированием"""
    
    def __init__(self, reviews: List[Review]):
        self.reviews = reviews
        
    def calculate_current_rating(self) -> Tuple[float, float, float]:
        """
        Расчет текущего взвешенного рейтинга
        Возвращает: (рейтинг, суммарный_вес, взвешенная_сумма)
        """
        if not self.reviews:
            return 0.0, 0.0, 0.0
            
        total_weight = sum(review.weight for review in self.reviews)
        weighted_sum = sum(review.rating * review.weight for review in self.reviews)
        
        if total_weight == 0:
            return 0.0, 0.0, 0.0
            
        current_rating = weighted_sum / total_weight
        
        return current_rating, total_weight, weighted_sum
    
    def calculate_required_reviews(self, target_rating: float) -> int:
        """
        Расчет количества 5-звездочных отзывов для достижения целевого рейтинга
        """
        current_rating, total_weight, weighted_sum = self.calculate_current_rating()
        
        if current_rating >= target_rating:
            return 0
            
        # N = ceil((Rt * W0 - S0) / (5 - Rt))
        numerator = target_rating * total_weight - weighted_sum
        denominator = 5 - target_rating
        
        if denominator <= 0:
            raise ValueError("Целевой рейтинг должен быть меньше 5")
            
        required_reviews = ceil(numerator / denominator)
        
        return max(0, required_reviews)
    
    def get_statistics(self) -> Dict:
        """Получение статистики по отзывам"""
        if not self.reviews:
            return {
                'total_reviews': 0,
                'rating_distribution': {},
                'average_age_days': 0,
                'active_reviews': 0
            }
            
        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[i] = len([r for r in self.reviews if r.rating == i])
            
        active_reviews = len([r for r in self.reviews if r.weight > 0])
        avg_age = sum(r.age_days for r in self.reviews) / len(self.reviews)
        
        return {
            'total_reviews': len(self.reviews),
            'rating_distribution': rating_distribution,
            'average_age_days': round(avg_age, 1),
            'active_reviews': active_reviews,
            'oldest_review_days': max(r.age_days for r in self.reviews),
            'newest_review_days': min(r.age_days for r in self.reviews)
        }


async def analyze_product_reviews(url_or_id: str, target_rating: float = 4.5) -> Dict:
    """
    Основная функция анализа отзывов товара
    """
    async with OzonReviewsParser() as parser:
        # Извлекаем ID товара
        product_id = parser.extract_product_id(url_or_id)
        
        # Загружаем и парсим отзывы
        await parser.load_reviews_page(product_id)
        reviews = await parser.extract_reviews()
        
        # Анализируем
        analyzer = ReviewsAnalyzer(reviews)
        current_rating, total_weight, weighted_sum = analyzer.calculate_current_rating()
        required_reviews = analyzer.calculate_required_reviews(target_rating)
        statistics = analyzer.get_statistics()
        
        return {
            'product_id': product_id,
            'current_rating': round(current_rating, 2),
            'target_rating': target_rating,
            'required_5star_reviews': required_reviews,
            'total_weight': round(total_weight, 2),
            'weighted_sum': round(weighted_sum, 2),
            'statistics': statistics
        }


# Пример использования
if __name__ == "__main__":
    async def main():
        # Тестовый запуск
        product_url = "https://www.ozon.ru/product/example-123456"
        target = 4.5
        
        try:
            result = await analyze_product_reviews(product_url, target)
            print(json.dumps(result, indent=2, ensure_ascii=False))
        except Exception as e:
            logger.error(f"Ошибка: {e}")
    
    asyncio.run(main())