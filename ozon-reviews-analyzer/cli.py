#!/usr/bin/env python3
"""
CLI утилита для анализа отзывов Ozon
"""
import asyncio
import argparse
import sys
import json
from typing import Optional
from pathlib import Path
import csv
from datetime import datetime

from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich import box
from rich.live import Live
from rich.layout import Layout

from ozon_reviews_analyzer import analyze_product_reviews


console = Console()


class OzonReviewsCLI:
    """CLI интерфейс для анализа отзывов"""
    
    def __init__(self):
        self.console = console
        
    def create_parser(self) -> argparse.ArgumentParser:
        """Создание парсера аргументов"""
        parser = argparse.ArgumentParser(
            description="Анализатор отзывов Ozon с расчетом взвешенного рейтинга",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Примеры использования:
  %(prog)s analyze 123456789 --target 4.5
  %(prog)s analyze https://www.ozon.ru/product/example-123456 --target 4.7
  %(prog)s batch products.txt --target 4.5 --output results.csv
  %(prog)s analyze 123456 --format json > result.json
            """
        )
        
        subparsers = parser.add_subparsers(dest='command', help='Доступные команды')
        
        # Команда analyze
        analyze_parser = subparsers.add_parser(
            'analyze',
            help='Анализ одного товара'
        )
        analyze_parser.add_argument(
            'product',
            help='URL товара или артикул'
        )
        analyze_parser.add_argument(
            '--target', '-t',
            type=float,
            default=4.5,
            help='Целевой рейтинг (по умолчанию: 4.5)'
        )
        analyze_parser.add_argument(
            '--format', '-f',
            choices=['table', 'json', 'csv'],
            default='table',
            help='Формат вывода (по умолчанию: table)'
        )
        
        # Команда batch
        batch_parser = subparsers.add_parser(
            'batch',
            help='Пакетный анализ товаров'
        )
        batch_parser.add_argument(
            'input_file',
            type=Path,
            help='Файл со списком товаров (по одному на строку)'
        )
        batch_parser.add_argument(
            '--target', '-t',
            type=float,
            default=4.5,
            help='Целевой рейтинг для всех товаров'
        )
        batch_parser.add_argument(
            '--output', '-o',
            type=Path,
            help='Файл для сохранения результатов'
        )
        batch_parser.add_argument(
            '--format', '-f',
            choices=['csv', 'json'],
            default='csv',
            help='Формат выходного файла'
        )
        
        # Команда monitor
        monitor_parser = subparsers.add_parser(
            'monitor',
            help='Мониторинг изменений рейтинга'
        )
        monitor_parser.add_argument(
            'product',
            help='URL товара или артикул'
        )
        monitor_parser.add_argument(
            '--interval', '-i',
            type=int,
            default=3600,
            help='Интервал проверки в секундах (по умолчанию: 3600)'
        )
        monitor_parser.add_argument(
            '--target', '-t',
            type=float,
            help='Уведомлять при достижении целевого рейтинга'
        )
        
        return parser
    
    def format_table_output(self, result: dict) -> None:
        """Форматированный вывод в виде таблицы"""
        # Основная информация
        info_table = Table(title="Анализ отзывов Ozon", box=box.ROUNDED)
        info_table.add_column("Параметр", style="cyan")
        info_table.add_column("Значение", style="white")
        
        info_table.add_row("Артикул", result['product_id'])
        info_table.add_row("Текущий рейтинг", f"⭐ {result['current_rating']:.2f}")
        info_table.add_row("Целевой рейтинг", f"🎯 {result['target_rating']}")
        
        if result['required_5star_reviews'] == 0:
            info_table.add_row(
                "Необходимо 5★ отзывов",
                "[green]✅ Цель достигнута![/green]"
            )
        else:
            info_table.add_row(
                "Необходимо 5★ отзывов",
                f"[yellow]{result['required_5star_reviews']}[/yellow]"
            )
        
        self.console.print(info_table)
        
        # Статистика
        stats = result['statistics']
        stats_table = Table(title="Статистика отзывов", box=box.SIMPLE)
        stats_table.add_column("Показатель", style="cyan")
        stats_table.add_column("Значение", style="white")
        
        stats_table.add_row("Всего отзывов", str(stats['total_reviews']))
        stats_table.add_row("Активных отзывов", str(stats['active_reviews']))
        stats_table.add_row(
            "Средний возраст",
            f"{stats['average_age_days']:.0f} дней"
        )
        
        self.console.print("\n")
        self.console.print(stats_table)
        
        # График распределения оценок
        self.console.print("\n[bold]Распределение оценок:[/bold]")
        
        dist = stats['rating_distribution']
        max_count = max(dist.values()) if dist else 1
        
        for rating in range(5, 0, -1):
            count = dist.get(rating, 0)
            bar_length = int((count / max_count) * 30) if max_count > 0 else 0
            bar = "█" * bar_length
            
            self.console.print(
                f"{rating}★ [{count:4d}] {bar}",
                style="yellow" if rating == 5 else "white"
            )
    
    def format_json_output(self, result: dict) -> None:
        """Вывод в формате JSON"""
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    def format_csv_output(self, result: dict) -> None:
        """Вывод в формате CSV"""
        writer = csv.writer(sys.stdout)
        writer.writerow([
            'product_id',
            'current_rating',
            'target_rating',
            'required_5star_reviews',
            'total_reviews',
            'active_reviews'
        ])
        
        stats = result['statistics']
        writer.writerow([
            result['product_id'],
            result['current_rating'],
            result['target_rating'],
            result['required_5star_reviews'],
            stats['total_reviews'],
            stats['active_reviews']
        ])
    
    async def analyze_single(self, args) -> None:
        """Анализ одного товара"""
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=self.console
        ) as progress:
            task = progress.add_task(
                f"Анализирую товар {args.product}...",
                total=None
            )
            
            try:
                result = await analyze_product_reviews(
                    args.product,
                    args.target
                )
                
                progress.stop()
                
                # Форматируем вывод
                if args.format == 'table':
                    self.format_table_output(result)
                elif args.format == 'json':
                    self.format_json_output(result)
                elif args.format == 'csv':
                    self.format_csv_output(result)
                    
            except Exception as e:
                progress.stop()
                self.console.print(
                    f"[red]Ошибка: {str(e)}[/red]"
                )
                sys.exit(1)
    
    async def analyze_batch(self, args) -> None:
        """Пакетный анализ товаров"""
        # Читаем список товаров
        if not args.input_file.exists():
            self.console.print(
                f"[red]Файл {args.input_file} не найден[/red]"
            )
            sys.exit(1)
        
        products = [
            line.strip()
            for line in args.input_file.read_text().splitlines()
            if line.strip()
        ]
        
        if not products:
            self.console.print("[red]Файл пустой[/red]")
            sys.exit(1)
        
        self.console.print(
            f"Найдено товаров для анализа: [cyan]{len(products)}[/cyan]"
        )
        
        results = []
        errors = []
        
        with Progress(console=self.console) as progress:
            task = progress.add_task(
                "Анализ товаров...",
                total=len(products)
            )
            
            for i, product in enumerate(products):
                progress.update(
                    task,
                    description=f"Анализирую {product}..."
                )
                
                try:
                    result = await analyze_product_reviews(
                        product,
                        args.target
                    )
                    results.append(result)
                except Exception as e:
                    errors.append({
                        'product': product,
                        'error': str(e)
                    })
                
                progress.advance(task)
                
                # Небольшая задержка между запросами
                if i < len(products) - 1:
                    await asyncio.sleep(2)
        
        # Выводим результаты
        self.console.print(
            f"\n✅ Успешно проанализировано: [green]{len(results)}[/green]"
        )
        
        if errors:
            self.console.print(
                f"❌ Ошибок: [red]{len(errors)}[/red]"
            )
            for error in errors:
                self.console.print(
                    f"  - {error['product']}: {error['error']}"
                )
        
        # Сохраняем результаты
        if args.output and results:
            self.save_batch_results(results, args.output, args.format)
        else:
            # Выводим сводную таблицу
            self.print_batch_summary(results)
    
    def save_batch_results(
        self,
        results: list,
        output_file: Path,
        format: str
    ) -> None:
        """Сохранение результатов пакетного анализа"""
        if format == 'csv':
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'product_id',
                    'current_rating',
                    'target_rating',
                    'required_5star_reviews',
                    'total_reviews',
                    'active_reviews',
                    'average_age_days'
                ])
                
                for result in results:
                    stats = result['statistics']
                    writer.writerow([
                        result['product_id'],
                        result['current_rating'],
                        result['target_rating'],
                        result['required_5star_reviews'],
                        stats['total_reviews'],
                        stats['active_reviews'],
                        stats['average_age_days']
                    ])
        
        elif format == 'json':
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(
                    results,
                    f,
                    indent=2,
                    ensure_ascii=False
                )
        
        self.console.print(
            f"[green]Результаты сохранены в {output_file}[/green]"
        )
    
    def print_batch_summary(self, results: list) -> None:
        """Вывод сводки по пакетному анализу"""
        table = Table(
            title="Результаты пакетного анализа",
            box=box.ROUNDED
        )
        
        table.add_column("Артикул", style="cyan")
        table.add_column("Текущий", justify="right")
        table.add_column("Цель", justify="right")
        table.add_column("Нужно 5★", justify="right", style="yellow")
        table.add_column("Отзывов", justify="right")
        
        for result in results:
            stats = result['statistics']
            table.add_row(
                result['product_id'],
                f"{result['current_rating']:.2f}",
                f"{result['target_rating']}",
                str(result['required_5star_reviews']),
                str(stats['total_reviews'])
            )
        
        self.console.print(table)
    
    async def monitor_product(self, args) -> None:
        """Мониторинг изменений рейтинга"""
        self.console.print(
            Panel(
                f"Мониторинг товара: {args.product}\n"
                f"Интервал проверки: {args.interval} сек",
                title="Режим мониторинга",
                box=box.ROUNDED
            )
        )
        
        previous_rating = None
        
        try:
            while True:
                # Анализируем
                result = await analyze_product_reviews(args.product, 4.5)
                current_rating = result['current_rating']
                
                # Создаем информационную панель
                info = f"""
📦 Артикул: {result['product_id']}
⭐ Рейтинг: {current_rating:.3f}
📊 Отзывов: {result['statistics']['total_reviews']}
⏰ Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                """
                
                if previous_rating is not None:
                    change = current_rating - previous_rating
                    if change > 0:
                        info += f"\n📈 Изменение: +{change:.3f}"
                    elif change < 0:
                        info += f"\n📉 Изменение: {change:.3f}"
                    else:
                        info += f"\n➡️ Без изменений"
                
                # Проверяем достижение цели
                if args.target and current_rating >= args.target:
                    info += f"\n\n🎉 [green]Цель {args.target} достигнута![/green]"
                
                self.console.clear()
                self.console.print(
                    Panel(
                        info.strip(),
                        title="Текущее состояние",
                        box=box.ROUNDED
                    )
                )
                
                previous_rating = current_rating
                
                # Ждем следующей проверки
                self.console.print(
                    f"\nСледующая проверка через {args.interval} сек..."
                )
                await asyncio.sleep(args.interval)
                
        except KeyboardInterrupt:
            self.console.print("\n[yellow]Мониторинг остановлен[/yellow]")
    
    async def run(self) -> None:
        """Запуск CLI"""
        parser = self.create_parser()
        args = parser.parse_args()
        
        if not args.command:
            parser.print_help()
            sys.exit(1)
        
        try:
            if args.command == 'analyze':
                await self.analyze_single(args)
            elif args.command == 'batch':
                await self.analyze_batch(args)
            elif args.command == 'monitor':
                await self.monitor_product(args)
        except KeyboardInterrupt:
            self.console.print("\n[yellow]Прервано пользователем[/yellow]")
            sys.exit(0)


def main():
    """Точка входа"""
    cli = OzonReviewsCLI()
    asyncio.run(cli.run())


if __name__ == "__main__":
    main()