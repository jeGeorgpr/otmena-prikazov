"""
FastAPI веб-сервис для анализа отзывов Ozon
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
import asyncio
from datetime import datetime, timedelta
import redis
import json
import hashlib
from contextlib import asynccontextmanager

# Импорт основного модуля
from ozon_reviews_analyzer import analyze_product_reviews, OzonReviewsParser

# Инициализация Redis для кэширования (опционально)
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
    USE_CACHE = True
except:
    redis_client = None
    USE_CACHE = False
    print("Redis недоступен, работаем без кэширования")


# Pydantic модели
class AnalyzeRequest(BaseModel):
    """Запрос на анализ отзывов"""
    product_url_or_id: str = Field(..., description="URL товара или артикул")
    target_rating: float = Field(4.5, ge=1.0, le=5.0, description="Целевой рейтинг")
    force_refresh: bool = Field(False, description="Принудительное обновление кэша")
    
    @validator('product_url_or_id')
    def validate_input(cls, v):
        if not v.strip():
            raise ValueError("URL или артикул не может быть пустым")
        return v.strip()


class AnalyzeResponse(BaseModel):
    """Ответ с результатами анализа"""
    product_id: str
    current_rating: float
    target_rating: float
    required_5star_reviews: int
    total_weight: float
    weighted_sum: float
    statistics: Dict[str, Any]
    cached: bool = False
    cache_expires_at: Optional[datetime] = None


class ErrorResponse(BaseModel):
    """Модель ошибки"""
    error: str
    detail: Optional[str] = None


# Управление жизненным циклом приложения
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Запуск
    print("Запуск сервиса анализа отзывов Ozon...")
    yield
    # Завершение
    print("Завершение работы сервиса...")


# Создание приложения
app = FastAPI(
    title="Ozon Reviews Analyzer API",
    description="API для анализа отзывов товаров Ozon с расчетом взвешенного рейтинга",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_cache_key(product_url_or_id: str, target_rating: float) -> str:
    """Генерация ключа кэша"""
    data = f"{product_url_or_id}:{target_rating}"
    return f"ozon_reviews:{hashlib.md5(data.encode()).hexdigest()}"


async def get_cached_result(cache_key: str) -> Optional[Dict]:
    """Получение результата из кэша"""
    if not USE_CACHE:
        return None
        
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Ошибка при чтении кэша: {e}")
    
    return None


async def save_to_cache(cache_key: str, data: Dict, ttl_hours: int = 6):
    """Сохранение результата в кэш"""
    if not USE_CACHE:
        return
        
    try:
        cache_data = {
            **data,
            'cached': True,
            'cache_expires_at': (datetime.now() + timedelta(hours=ttl_hours)).isoformat()
        }
        redis_client.setex(
            cache_key,
            ttl_hours * 3600,
            json.dumps(cache_data, ensure_ascii=False)
        )
    except Exception as e:
        print(f"Ошибка при сохранении в кэш: {e}")


@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "service": "Ozon Reviews Analyzer",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "/api/v1/analyze",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    """Проверка состояния сервиса"""
    status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "cache_available": USE_CACHE
    }
    
    if USE_CACHE:
        try:
            redis_client.ping()
            status["cache_status"] = "connected"
        except:
            status["cache_status"] = "disconnected"
    
    return status


@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze_reviews(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks
):
    """
    Анализ отзывов товара
    
    - **product_url_or_id**: URL товара на Ozon или артикул
    - **target_rating**: Желаемый рейтинг (от 1 до 5)
    - **force_refresh**: Принудительное обновление данных
    """
    try:
        # Проверяем кэш
        cache_key = get_cache_key(request.product_url_or_id, request.target_rating)
        
        if not request.force_refresh:
            cached_result = await get_cached_result(cache_key)
            if cached_result:
                return AnalyzeResponse(**cached_result)
        
        # Выполняем анализ
        result = await analyze_product_reviews(
            request.product_url_or_id,
            request.target_rating
        )
        
        # Сохраняем в кэш в фоне
        background_tasks.add_task(save_to_cache, cache_key, result)
        
        return AnalyzeResponse(**result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при анализе отзывов: {str(e)}"
        )


@app.post("/api/v1/batch-analyze")
async def batch_analyze(
    products: list[AnalyzeRequest],
    background_tasks: BackgroundTasks
):
    """
    Пакетный анализ нескольких товаров
    """
    if len(products) > 10:
        raise HTTPException(
            status_code=400,
            detail="Максимальное количество товаров для пакетного анализа: 10"
        )
    
    results = []
    errors = []
    
    for i, product in enumerate(products):
        try:
            cache_key = get_cache_key(product.product_url_or_id, product.target_rating)
            
            # Проверяем кэш
            if not product.force_refresh:
                cached_result = await get_cached_result(cache_key)
                if cached_result:
                    results.append({
                        "index": i,
                        "status": "success",
                        "data": cached_result
                    })
                    continue
            
            # Анализируем
            result = await analyze_product_reviews(
                product.product_url_or_id,
                product.target_rating
            )
            
            # Сохраняем в кэш
            background_tasks.add_task(save_to_cache, cache_key, result)
            
            results.append({
                "index": i,
                "status": "success",
                "data": result
            })
            
            # Небольшая задержка между запросами
            await asyncio.sleep(1)
            
        except Exception as e:
            errors.append({
                "index": i,
                "status": "error",
                "error": str(e)
            })
    
    return {
        "total": len(products),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors
    }


@app.get("/api/v1/product/{product_id}")
async def get_product_info(product_id: str):
    """
    Получение информации о товаре по ID
    """
    try:
        async with OzonReviewsParser() as parser:
            # Простая проверка существования товара
            await parser.load_reviews_page(product_id)
            
            # Можно расширить, добавив извлечение названия товара и др.
            return {
                "product_id": product_id,
                "status": "found",
                "url": f"https://www.ozon.ru/product/{product_id}"
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Товар не найден или ошибка доступа: {str(e)}"
        )


# Обработчик ошибок
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return ErrorResponse(
        error=exc.detail,
        detail=str(exc)
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )