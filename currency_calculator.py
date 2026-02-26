from __future__ import annotations

import ast
import re
import sys
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Dict, List, Optional
from urllib.error import URLError
from urllib.request import Request, urlopen

PRIMARY_URL = "https://www.kamkombank.ru/rus/rates/"
FALLBACK_URL = "https://www.kamkombank.ru/rus/course_msk/"
USER_AGENT = "Mozilla/5.0 (CurrencyCalculator/1.0)"


@dataclass
class CurrencyRate:
    code: str
    units: int
    name: str
    buy: Optional[float]
    sell: Optional[float]


@dataclass
class BranchRates:
    branch: str
    rates: Dict[str, CurrencyRate]


class KamkomRatesHTMLParser(HTMLParser):
    """Extracts branch titles and currency rows from Kamkombank pages."""

    def __init__(self) -> None:
        super().__init__()
        self._capture_tag: Optional[str] = None
        self._text_chunks: List[str] = []
        self._in_table = False
        self._in_row = False
        self._in_cell = False
        self._row_cells: List[str] = []
        self._last_heading: Optional[str] = None
        self._current_table_branch: Optional[str] = None
        self._current_branch_rates: Optional[BranchRates] = None
        self.branches: List[BranchRates] = []
        self.page_text: List[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        tag = tag.lower()
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span", "li"}:
            self._capture_tag = tag
            self._text_chunks = []
        elif tag == "table":
            self._in_table = True
            self._current_table_branch = self._last_heading
            self._current_branch_rates = BranchRates(
                branch=self._current_table_branch or "Неизвестное отделение",
                rates={},
            )
        elif tag == "tr" and self._in_table:
            self._in_row = True
            self._row_cells = []
        elif tag in {"td", "th"} and self._in_row:
            self._in_cell = True
            self._text_chunks = []

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"td", "th"} and self._in_row and self._in_cell:
            text = self._normalize("".join(self._text_chunks))
            self._row_cells.append(text)
            self._in_cell = False
            self._text_chunks = []
        elif tag == "tr" and self._in_table and self._in_row:
            self._process_row(self._row_cells)
            self._in_row = False
            self._row_cells = []
        elif tag == "table" and self._in_table:
            if self._current_branch_rates and self._current_branch_rates.rates:
                self.branches.append(self._current_branch_rates)
            self._in_table = False
            self._current_table_branch = None
            self._current_branch_rates = None
        elif tag in {"h1", "h2", "h3", "h4", "h5", "h6", "p", "div", "span", "li"} and self._capture_tag == tag:
            text = self._normalize("".join(self._text_chunks))
            if text:
                self.page_text.append(text)
                if self._looks_like_branch_title(text):
                    self._last_heading = text
            self._capture_tag = None
            self._text_chunks = []

    def handle_data(self, data: str) -> None:
        if self._capture_tag is not None or self._in_cell:
            self._text_chunks.append(data)

    @staticmethod
    def _normalize(value: str) -> str:
        return re.sub(r"\s+", " ", value).strip()

    @staticmethod
    def _looks_like_branch_title(text: str) -> bool:
        markers = ["Москва", "Санкт-Петербург", "Казань", "Новосибирск", "Екатеринбург", "Нижний Новгород"]
        return any(marker in text for marker in markers) and any(ch.isdigit() for ch in text)

    def _process_row(self, cells: List[str]) -> None:
        if not self._current_branch_rates:
            return
        if len(cells) < 3:
            return

        # Typical row: [USD, 1, Доллар США, 76.75, 76.95]
        code = cells[0].upper()
        if not re.fullmatch(r"[A-Z]{3}", code):
            return

        try:
            units = int(cells[1])
        except ValueError:
            units = 1

        name = cells[2]
        buy = self._parse_decimal(cells[3]) if len(cells) > 3 else None
        sell = self._parse_decimal(cells[4]) if len(cells) > 4 else None

        self._current_branch_rates.rates[code] = CurrencyRate(
            code=code,
            units=units,
            name=name,
            buy=buy,
            sell=sell,
        )

    @staticmethod
    def _parse_decimal(value: str) -> Optional[float]:
        value = value.replace(",", ".").strip()
        if not value:
            return None
        try:
            return float(value)
        except ValueError:
            return None


class SafeCalc(ast.NodeVisitor):
    """Safe arithmetic evaluator for + - * / // % ** and parentheses."""

    ALLOWED_BINOPS = {
        ast.Add: lambda a, b: a + b,
        ast.Sub: lambda a, b: a - b,
        ast.Mult: lambda a, b: a * b,
        ast.Div: lambda a, b: a / b,
        ast.FloorDiv: lambda a, b: a // b,
        ast.Mod: lambda a, b: a % b,
        ast.Pow: lambda a, b: a ** b,
    }
    ALLOWED_UNARYOPS = {
        ast.UAdd: lambda x: +x,
        ast.USub: lambda x: -x,
    }

    def visit_Expression(self, node: ast.Expression):
        return self.visit(node.body)

    def visit_BinOp(self, node: ast.BinOp):
        op_type = type(node.op)
        if op_type not in self.ALLOWED_BINOPS:
            raise ValueError("Недопустимая операция")
        return self.ALLOWED_BINOPS[op_type](self.visit(node.left), self.visit(node.right))

    def visit_UnaryOp(self, node: ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in self.ALLOWED_UNARYOPS:
            raise ValueError("Недопустимая операция")
        return self.ALLOWED_UNARYOPS[op_type](self.visit(node.operand))

    def visit_Constant(self, node: ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError("Только числа")

    def generic_visit(self, node):
        raise ValueError("Недопустимое выражение")


def safe_calculate(expression: str) -> float:
    tree = ast.parse(expression, mode="eval")
    return SafeCalc().visit(tree)


def fetch_html(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=15) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def parse_kamkom_rates(html: str) -> tuple[List[BranchRates], Optional[str]]:
    parser = KamkomRatesHTMLParser()
    parser.feed(html)
    text_blob = "\n".join(parser.page_text)
    date_match = re.search(r"(?:установленные банком на|Курс валют\s*/?)\s*(\d{1,2}[. ]\d{1,2}[. ]\d{4}|\d{1,2}\s+\w+\s+\d{4})", text_blob, re.IGNORECASE)
    page_date = date_match.group(1) if date_match else None
    return parser.branches, page_date


def load_rates() -> tuple[List[BranchRates], Optional[str], str]:
    last_error = None
    for url in (PRIMARY_URL, FALLBACK_URL):
        try:
            html = fetch_html(url)
            branches, page_date = parse_kamkom_rates(html)
            if branches:
                return branches, page_date, url
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise RuntimeError(f"Не удалось получить курсы. Последняя ошибка: {last_error}")


def find_moscow_branch(branches: List[BranchRates]) -> Optional[BranchRates]:
    for branch in branches:
        if "Москва" in branch.branch and "USD" in branch.rates and "EUR" in branch.rates:
            return branch
    return None


def print_rates(branch: BranchRates, page_date: Optional[str], source_url: str) -> None:
    print("\n=== Курсы валют (Камкомбанк) ===")
    print(f"Отделение: {branch.branch}")
    if page_date:
        print(f"Дата на сайте: {page_date}")
    print(f"Источник: {source_url}")
    print()
    for code in ("USD", "EUR"):
        rate = branch.rates.get(code)
        if not rate:
            continue
        buy = f"{rate.buy:.2f}" if rate.buy is not None else "нет данных"
        sell = f"{rate.sell:.2f}" if rate.sell is not None else "нет данных"
        print(f"{code}: покупка={buy} RUB, продажа={sell} RUB")
    print()
    print("Подсказка: если вы сдаете валюту в банк (USD/EUR -> RUB), используется 'покупка'.")
    print("Если покупаете валюту за рубли (RUB -> USD/EUR), используется 'продажа'.")


def convert_amount(branch: BranchRates) -> None:
    print("\nВыберите направление:")
    print("1. USD -> RUB")
    print("2. RUB -> USD")
    print("3. EUR -> RUB")
    print("4. RUB -> EUR")
    choice = input("Ваш выбор: ").strip()

    mapping = {
        "1": ("USD", "to_rub"),
        "2": ("USD", "from_rub"),
        "3": ("EUR", "to_rub"),
        "4": ("EUR", "from_rub"),
    }
    if choice not in mapping:
        print("Неверный выбор.")
        return

    code, direction = mapping[choice]
    rate = branch.rates.get(code)
    if not rate:
        print(f"Курс {code} не найден.")
        return

    try:
        amount = float(input("Введите сумму: ").replace(",", "."))
    except ValueError:
        print("Сумма должна быть числом.")
        return

    if amount < 0:
        print("Сумма не может быть отрицательной.")
        return

    if direction == "to_rub":
        if rate.buy is None:
            print("Нет курса 'покупка' для этой валюты.")
            return
        result = amount * (rate.buy / rate.units)
        print(f"{amount:.2f} {code} = {result:.2f} RUB (по курсу покупки {rate.buy:.2f})")
    else:
        if rate.sell is None or rate.sell == 0:
            print("Нет курса 'продажа' для этой валюты.")
            return
        result = amount / (rate.sell / rate.units)
        print(f"{amount:.2f} RUB = {result:.2f} {code} (по курсу продажи {rate.sell:.2f})")


def run_calculator() -> None:
    expr = input("Введите выражение (например 2+2*5): ").strip()
    if not expr:
        print("Пустое выражение.")
        return
    try:
        value = safe_calculate(expr)
    except Exception as exc:  # noqa: BLE001
        print(f"Ошибка вычисления: {exc}")
        return
    print(f"Результат: {value}")


def main() -> None:
    try:
        branches, page_date, source_url = load_rates()
    except Exception as exc:  # noqa: BLE001
        print(f"Ошибка загрузки курсов: {exc}")
        sys.exit(1)

    branch = find_moscow_branch(branches)
    if not branch:
        print("Не найдено отделение Москвы с курсами USD/EUR.")
        sys.exit(1)

    while True:
        print("\n=== Меню ===")
        print("1. Калькулятор")
        print("2. Показать курсы USD/EUR (Москва)")
        print("3. Конвертер USD/EUR <-> RUB")
        print("0. Выход")
        choice = input("Ваш выбор: ").strip()

        if choice == "1":
            run_calculator()
        elif choice == "2":
            print_rates(branch, page_date, source_url)
        elif choice == "3":
            print_rates(branch, page_date, source_url)
            convert_amount(branch)
        elif choice == "0":
            print("Выход.")
            break
        else:
            print("Неверный пункт меню.")


if __name__ == "__main__":
    main()
