from setuptools import setup, find_packages

setup(
    name="ozon-reviews-analyzer",
    version="1.0.0",
    description="Анализатор отзывов Ozon с расчетом взвешенного рейтинга",
    author="Your Name",
    python_requires=">=3.8",
    packages=find_packages(),
    install_requires=[
        "playwright>=1.40.0",
        "beautifulsoup4>=4.12.2",
        "fastapi>=0.109.0",
        "uvicorn[standard]>=0.27.0",
        "pydantic>=2.5.3",
        "python-telegram-bot>=20.7",
    ],
    extras_require={
        "cache": ["redis>=5.0.1"],
        "dev": [
            "pytest>=7.4.4",
            "pytest-asyncio>=0.23.3",
            "python-dotenv>=1.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "ozon-reviews-api=api:main",
            "ozon-reviews-bot=telegram_bot:main",
        ],
    },
)