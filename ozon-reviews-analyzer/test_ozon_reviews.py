"""
Тесты для Ozon Reviews Analyzer
"""
import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from ozon_reviews_analyzer import (
    Review,
    OzonReviewsParser,
    ReviewsAnalyzer,
    analyze_product_reviews
)


class TestReview:
    """Тесты для модели Review"""
    
    def test_review_creation(self):
        """Тест создания отзыва"""
        review = Review(
            rating=5,
            date=datetime.now() - timedelta(days=30),
            text="Отличный товар!"
        )
        
        assert review.rating == 5
        assert review.age_days == 30
        assert review.text == "Отличный товар!"
    
    def test_review_weight_calculation(self):
        """Тест расчета веса отзыва"""
        # Новый отзыв (вес = 1)
        new_review = Review(rating=5, date=datetime.now())
        assert new_review.weight == 1.0
        
        # Отзыв 6 месяцев назад (вес ≈ 0.5)
        old_review = Review(
            rating=5,
            date=datetime.now() - timedelta(days=182)
        )
        assert 0.49 < old_review.weight < 0.51
        
        # Отзыв год назад (вес = 0)
        very_old_review = Review(
            rating=5,
            date=datetime.now() - timedelta(days=365)
        )
        assert very_old_review.weight == 0
        
        # Отзыв старше года (вес = 0)
        ancient_review = Review(
            rating=5,
            date=datetime.now() - timedelta(days=400)
        )
        assert ancient_review.weight == 0


class TestOzonReviewsParser:
    """Тесты для парсера"""
    
    def test_extract_product_id_from_url(self):
        """Тест извлечения ID из URL"""
        parser = OzonReviewsParser()
        
        # Полный URL
        url = "https://www.ozon.ru/product/example-name-123456789"
        assert parser.extract_product_id(url) == "123456789"
        
        # URL с дополнительными параметрами
        url = "https://www.ozon.ru/product/test-456789123/?asb=123"
        assert parser.extract_product_id(url) == "456789123"
        
        # Только артикул
        assert parser.extract_product_id("987654321") == "987654321"
        
        # Неверный формат
        with pytest.raises(ValueError):
            parser.extract_product_id("invalid-url")
    
    def test_parse_date(self):
        """Тест парсинга дат"""
        parser = OzonReviewsParser()
        
        # Относительные даты
        today = parser.parse_date("сегодня")
        assert today.date() == datetime.now().date()
        
        yesterday = parser.parse_date("вчера")
        assert yesterday.date() == (datetime.now() - timedelta(days=1)).date()
        
        days_ago = parser.parse_date("5 дней назад")
        expected = (datetime.now() - timedelta(days=5)).date()
        assert days_ago.date() == expected
        
        # Абсолютные даты
        date = parser.parse_date("15 января 2024")
        assert date == datetime(2024, 1, 15)
        
        # Текущий год, если не указан
        date = parser.parse_date("20 марта")
        assert date.month == 3
        assert date.day == 20
        assert date.year == datetime.now().year
    
    @pytest.mark.asyncio
    async def test_scroll_to_load_reviews(self):
        """Тест прокрутки страницы"""
        parser = OzonReviewsParser()
        parser.page = AsyncMock()
        
        # Мокаем изменение высоты страницы
        parser.page.evaluate = AsyncMock(
            side_effect=[1000, 2000, 2000]  # Высота увеличивается, потом стабилизируется
        )
        parser.page.query_selector = AsyncMock(return_value=None)
        
        await parser.scroll_to_load_all_reviews(max_scrolls=5)
        
        # Проверяем, что прокрутка выполнялась
        assert parser.page.evaluate.call_count >= 3


class TestReviewsAnalyzer:
    """Тесты для анализатора"""
    
    def create_test_reviews(self):
        """Создание тестовых отзывов"""
        return [
            Review(rating=5, date=datetime.now() - timedelta(days=1)),
            Review(rating=4, date=datetime.now() - timedelta(days=30)),
            Review(rating=5, date=datetime.now() - timedelta(days=60)),
            Review(rating=3, date=datetime.now() - timedelta(days=180)),
            Review(rating=2, date=datetime.now() - timedelta(days=400)),  # Не учитывается
        ]
    
    def test_calculate_current_rating(self):
        """Тест расчета текущего рейтинга"""
        reviews = self.create_test_reviews()
        analyzer = ReviewsAnalyzer(reviews)
        
        rating, total_weight, weighted_sum = analyzer.calculate_current_rating()
        
        # Проверяем, что рейтинг в разумных пределах
        assert 3.0 < rating < 5.0
        assert total_weight > 0
        assert weighted_sum > 0
        
        # Проверяем, что старый отзыв не учитывается
        active_reviews = [r for r in reviews if r.weight > 0]
        assert len(active_reviews) == 4  # 5й отзыв старше года
    
    def test_calculate_required_reviews(self):
        """Тест расчета необходимых отзывов"""
        reviews = self.create_test_reviews()
        analyzer = ReviewsAnalyzer(reviews)
        
        # Для достижения рейтинга 4.5
        required = analyzer.calculate_required_reviews(4.5)
        assert required > 0
        
        # Для уже достигнутого рейтинга
        current_rating, _, _ = analyzer.calculate_current_rating()
        required = analyzer.calculate_required_reviews(current_rating - 0.1)
        assert required == 0
        
        # Для невозможного рейтинга
        with pytest.raises(ValueError):
            analyzer.calculate_required_reviews(5.0)
    
    def test_get_statistics(self):
        """Тест получения статистики"""
        reviews = self.create_test_reviews()
        analyzer = ReviewsAnalyzer(reviews)
        
        stats = analyzer.get_statistics()
        
        assert stats['total_reviews'] == 5
        assert stats['active_reviews'] == 4
        assert stats['rating_distribution'][5] == 2
        assert stats['rating_distribution'][4] == 1
        assert stats['rating_distribution'][3] == 1
        assert stats['rating_distribution'][2] == 1
        assert stats['average_age_days'] > 0
    
    def test_empty_reviews(self):
        """Тест с пустым списком отзывов"""
        analyzer = ReviewsAnalyzer([])
        
        rating, weight, sum_ = analyzer.calculate_current_rating()
        assert rating == 0.0
        assert weight == 0.0
        assert sum_ == 0.0
        
        stats = analyzer.get_statistics()
        assert stats['total_reviews'] == 0


class TestIntegration:
    """Интеграционные тесты"""
    
    @pytest.mark.asyncio
    async def test_analyze_product_reviews_mock(self):
        """Тест полного процесса анализа с моками"""
        with patch('ozon_reviews_analyzer.OzonReviewsParser') as MockParser:
            # Настраиваем мок
            mock_parser = MockParser.return_value.__aenter__.return_value
            mock_parser.extract_product_id.return_value = "123456"
            mock_parser.load_reviews_page = AsyncMock()
            mock_parser.extract_reviews = AsyncMock(
                return_value=[
                    Review(rating=5, date=datetime.now()),
                    Review(rating=4, date=datetime.now() - timedelta(days=10)),
                    Review(rating=5, date=datetime.now() - timedelta(days=20)),
                ]
            )
            
            # Выполняем анализ
            result = await analyze_product_reviews("123456", 4.8)
            
            # Проверяем результат
            assert result['product_id'] == "123456"
            assert result['target_rating'] == 4.8
            assert 'current_rating' in result
            assert 'required_5star_reviews' in result
            assert 'statistics' in result


class TestAPI:
    """Тесты для API"""
    
    @pytest.fixture
    def client(self):
        """Создание тестового клиента"""
        from fastapi.testclient import TestClient
        from api import app
        return TestClient(app)
    
    def test_root_endpoint(self, client):
        """Тест корневого эндпоинта"""
        response = client.get("/")
        assert response.status_code == 200
        assert "service" in response.json()
    
    def test_health_endpoint(self, client):
        """Тест эндпоинта здоровья"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
    
    @patch('api.analyze_product_reviews')
    def test_analyze_endpoint(self, mock_analyze, client):
        """Тест эндпоинта анализа"""
        # Настраиваем мок
        mock_analyze.return_value = {
            'product_id': '123456',
            'current_rating': 4.2,
            'target_rating': 4.5,
            'required_5star_reviews': 10,
            'total_weight': 100.0,
            'weighted_sum': 420.0,
            'statistics': {
                'total_reviews': 100,
                'active_reviews': 80,
                'rating_distribution': {1: 5, 2: 10, 3: 15, 4: 30, 5: 40},
                'average_age_days': 45.5,
                'oldest_review_days': 364,
                'newest_review_days': 0
            }
        }
        
        # Отправляем запрос
        response = client.post(
            "/api/v1/analyze",
            json={
                "product_url_or_id": "123456",
                "target_rating": 4.5
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['product_id'] == '123456'
        assert data['required_5star_reviews'] == 10
    
    def test_analyze_invalid_input(self, client):
        """Тест с невалидными данными"""
        response = client.post(
            "/api/v1/analyze",
            json={
                "product_url_or_id": "",
                "target_rating": 6.0  # Невалидный рейтинг
            }
        )
        
        assert response.status_code == 422  # Validation error


# Fixtures для pytest
@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])