const KAMKOM_URLS = [
  "https://www.kamkombank.ru/rus/rates/",
  "https://www.kamkombank.ru/rus/course_msk/",
];

const PROXY_BUILDERS = [
  (url) => ({ url, source: "Прямой запрос" }),
  (url) => ({
    url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    source: "allorigins.win",
  }),
  (url) => ({
    url: `https://r.jina.ai/http://www.kamkombank.ru${new URL(url).pathname}`,
    source: "r.jina.ai",
  }),
];

const state = {
  sourceLabel: "kamkombank.ru",
  siteDate: null,
  branches: [],
  selectedBranchIndex: -1,
  rates: {
    USD: null,
    EUR: null,
  },
};

const els = {
  refreshRatesBtn: document.getElementById("refreshRatesBtn"),
  ratesStatus: document.getElementById("ratesStatus"),
  sourceLabel: document.getElementById("sourceLabel"),
  siteDate: document.getElementById("siteDate"),
  branchSelect: document.getElementById("branchSelect"),
  usdBuy: document.getElementById("usdBuy"),
  usdSell: document.getElementById("usdSell"),
  usdUnits: document.getElementById("usdUnits"),
  eurBuy: document.getElementById("eurBuy"),
  eurSell: document.getElementById("eurSell"),
  eurUnits: document.getElementById("eurUnits"),
  calcForm: document.getElementById("calcForm"),
  calcExpression: document.getElementById("calcExpression"),
  calcResult: document.getElementById("calcResult"),
  converterForm: document.getElementById("converterForm"),
  direction: document.getElementById("direction"),
  amount: document.getElementById("amount"),
  convertResult: document.getElementById("convertResult"),
  applyManualBtn: document.getElementById("applyManualBtn"),
  manualUsdBuy: document.getElementById("manualUsdBuy"),
  manualUsdSell: document.getElementById("manualUsdSell"),
  manualEurBuy: document.getElementById("manualEurBuy"),
  manualEurSell: document.getElementById("manualEurSell"),
};

init();

function init() {
  bindEvents();
  renderBranchOptions();
  renderRates();
  loadRates();
}

function bindEvents() {
  els.refreshRatesBtn.addEventListener("click", () => {
    loadRates();
  });

  els.branchSelect.addEventListener("change", () => {
    state.selectedBranchIndex = Number(els.branchSelect.value);
    applySelectedBranchRates();
    renderRates();
  });

  els.calcForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const expr = els.calcExpression.value.trim();
    if (!expr) {
      els.calcResult.textContent = "Результат: введите выражение";
      return;
    }
    try {
      const result = safeEvaluate(expr);
      els.calcResult.textContent = `Результат: ${formatNumber(result, 8)}`;
    } catch (error) {
      els.calcResult.textContent = `Ошибка: ${error.message}`;
    }
  });

  els.converterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const value = convertAmount({
        direction: els.direction.value,
        amount: Number(els.amount.value),
        rates: state.rates,
      });
      els.convertResult.textContent = `Результат: ${value}`;
    } catch (error) {
      els.convertResult.textContent = `Ошибка: ${error.message}`;
    }
  });

  els.applyManualBtn.addEventListener("click", () => {
    const manualRates = {
      USD: {
        code: "USD",
        units: 1,
        buy: parseNumberInput(els.manualUsdBuy.value),
        sell: parseNumberInput(els.manualUsdSell.value),
      },
      EUR: {
        code: "EUR",
        units: 1,
        buy: parseNumberInput(els.manualEurBuy.value),
        sell: parseNumberInput(els.manualEurSell.value),
      },
    };

    if (!manualRates.USD.buy || !manualRates.USD.sell || !manualRates.EUR.buy || !manualRates.EUR.sell) {
      setStatus("Заполните все 4 поля ручных курсов", "warn");
      return;
    }

    state.rates = manualRates;
    state.branches = [];
    state.selectedBranchIndex = -1;
    state.siteDate = null;
    state.sourceLabel = "Ручной ввод";
    renderBranchOptions();
    renderRates();
    setStatus("Ручные курсы применены", "ok");
  });
}

async function loadRates() {
  setStatus("Загрузка курсов...", "");
  els.refreshRatesBtn.disabled = true;

  try {
    const result = await fetchKamkomRates();
    state.branches = result.branches;
    state.siteDate = result.siteDate || null;
    state.sourceLabel = `${result.sourceUrl} (${result.via})`;

    const preferredIndex = result.branches.findIndex((branch) => /москва/i.test(branch.branch));
    state.selectedBranchIndex = preferredIndex >= 0 ? preferredIndex : 0;
    renderBranchOptions();
    applySelectedBranchRates();
    renderRates();
    setStatus("Курсы загружены", "ok");
  } catch (error) {
    setStatus(`Не удалось загрузить курсы: ${error.message}`, "warn");
    renderRates();
  } finally {
    els.refreshRatesBtn.disabled = false;
  }
}

async function fetchKamkomRates() {
  const errors = [];

  for (const sourceUrl of KAMKOM_URLS) {
    for (const buildProxy of PROXY_BUILDERS) {
      const req = buildProxy(sourceUrl);
      try {
        const response = await fetch(req.url, { method: "GET" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        const { branches, siteDate } = parseKamkomHtml(text);
        if (!branches.length) {
          throw new Error("таблицы курсов не найдены");
        }
        return { branches, siteDate, sourceUrl, via: req.source };
      } catch (error) {
        errors.push(`${req.source} -> ${sourceUrl}: ${error.message}`);
      }
    }
  }

  throw new Error(errors[errors.length - 1] || "нет ответа от источника");
}

function parseKamkomHtml(html) {
  let doc;
  const isLikelyHtml = /<html|<table|<tr|<td/i.test(html);

  if (isLikelyHtml) {
    doc = new DOMParser().parseFromString(html, "text/html");
  } else {
    // Some proxies (e.g. r.jina.ai) may return markdown/plaintext. Wrap into text parser flow below.
    return parsePlainTextRates(html);
  }

  const allText = doc.body ? doc.body.innerText : doc.documentElement.textContent || "";
  const siteDate = extractDate(allText);

  const headingCandidates = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6,p,div,strong"))
    .map((el) => normalizeText(el.textContent))
    .filter(Boolean);

  const tables = Array.from(doc.querySelectorAll("table"));
  const branches = [];

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll("tr"));
    const parsedRows = [];

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("th,td")).map((cell) => normalizeText(cell.textContent));
      const rate = parseRateRow(cells);
      if (rate) parsedRows.push(rate);
    }

    if (!parsedRows.length) continue;
    const branchName = findNearbyBranchName(table, headingCandidates);
    const branch = { branch: branchName || `Отделение ${branches.length + 1}`, rates: {} };

    for (const rate of parsedRows) {
      branch.rates[rate.code] = rate;
    }

    if (branch.rates.USD || branch.rates.EUR) {
      branches.push(branch);
    }
  }

  if (branches.length) {
    return { branches, siteDate };
  }

  return parsePlainTextRates(allText);
}

function parsePlainTextRates(text) {
  const siteDate = extractDate(text);
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const branch = { branch: "Москва (текстовый парсинг)", rates: {} };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/^(USD|EUR)\b/i.test(line)) continue;

    const code = line.slice(0, 3).toUpperCase();
    const numbers = [line, lines[i + 1] || "", lines[i + 2] || ""].join(" ").match(/\d+[.,]\d+/g) || [];
    if (numbers.length < 2) continue;

    branch.rates[code] = {
      code,
      units: 1,
      buy: parseDecimal(numbers[0]),
      sell: parseDecimal(numbers[1]),
      name: code,
    };
  }

  if (branch.rates.USD || branch.rates.EUR) {
    return { branches: [branch], siteDate };
  }

  throw new Error("не удалось распознать USD/EUR в ответе сайта");
}

function parseRateRow(cells) {
  if (!cells || cells.length < 4) return null;

  const code = (cells[0] || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return null;

  const units = Number.parseInt(cells[1], 10);
  const name = cells[2] || code;

  const buy = parseDecimal(cells[3]);
  const sell = parseDecimal(cells[4]);

  if (!Number.isFinite(buy) && !Number.isFinite(sell)) return null;

  return {
    code,
    units: Number.isFinite(units) && units > 0 ? units : 1,
    name,
    buy: Number.isFinite(buy) ? buy : null,
    sell: Number.isFinite(sell) ? sell : null,
  };
}

function findNearbyBranchName(table, headingCandidates) {
  let el = table;
  let steps = 0;

  while (el && steps < 8) {
    let prev = el.previousElementSibling;
    while (prev) {
      const text = normalizeText(prev.textContent);
      if (looksLikeBranchName(text)) return text;
      prev = prev.previousElementSibling;
    }
    el = el.parentElement;
    steps += 1;
  }

  return headingCandidates.find((text) => looksLikeBranchName(text)) || null;
}

function looksLikeBranchName(text) {
  if (!text) return false;
  return /(Москва|Санкт|Казань|Новосибирск|Екатеринбург|Нижний Новгород)/i.test(text);
}

function extractDate(text) {
  const normalized = normalizeText(text);
  const patterns = [
    /(\d{1,2}[.]\d{1,2}[.]\d{4})/,
    /(\d{1,2}\s+[А-Яа-яA-Za-z]+\s+\d{4})/,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function applySelectedBranchRates() {
  const branch = state.branches[state.selectedBranchIndex];
  if (!branch) return;

  state.rates = {
    USD: branch.rates.USD || null,
    EUR: branch.rates.EUR || null,
  };
}

function renderBranchOptions() {
  const select = els.branchSelect;
  select.innerHTML = "";

  if (!state.branches.length) {
    const option = document.createElement("option");
    option.value = "-1";
    option.textContent = "Нет данных (можно ввести вручную)";
    select.append(option);
    select.disabled = true;
    return;
  }

  state.branches.forEach((branch, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = branch.branch;
    select.append(option);
  });

  select.disabled = false;
  if (state.selectedBranchIndex >= 0) {
    select.value = String(state.selectedBranchIndex);
  }
}

function renderRates() {
  renderCurrencyRow("USD", state.rates.USD, {
    buy: els.usdBuy,
    sell: els.usdSell,
    units: els.usdUnits,
  });
  renderCurrencyRow("EUR", state.rates.EUR, {
    buy: els.eurBuy,
    sell: els.eurSell,
    units: els.eurUnits,
  });

  els.sourceLabel.textContent = state.sourceLabel || "—";
  els.siteDate.textContent = state.siteDate || "—";
}

function renderCurrencyRow(code, rate, targets) {
  if (!rate) {
    targets.buy.textContent = "—";
    targets.sell.textContent = "—";
    targets.units.textContent = "1";
    return;
  }

  targets.buy.textContent = Number.isFinite(rate.buy) ? `${formatNumber(rate.buy, 2)} RUB` : "—";
  targets.sell.textContent = Number.isFinite(rate.sell) ? `${formatNumber(rate.sell, 2)} RUB` : "—";
  targets.units.textContent = String(rate.units || 1);
}

function convertAmount({ direction, amount, rates }) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Введите корректную сумму");
  }

  let code;
  let mode;
  switch (direction) {
    case "USD_TO_RUB":
      code = "USD";
      mode = "buy";
      break;
    case "RUB_TO_USD":
      code = "USD";
      mode = "sell_from_rub";
      break;
    case "EUR_TO_RUB":
      code = "EUR";
      mode = "buy";
      break;
    case "RUB_TO_EUR":
      code = "EUR";
      mode = "sell_from_rub";
      break;
    default:
      throw new Error("Неизвестное направление");
  }

  const rate = rates[code];
  if (!rate) {
    throw new Error(`Нет курса ${code}`);
  }

  const units = Number.isFinite(rate.units) && rate.units > 0 ? rate.units : 1;

  if (mode === "buy") {
    if (!Number.isFinite(rate.buy)) throw new Error(`Нет курса покупки для ${code}`);
    const rub = amount * (rate.buy / units);
    return `${formatNumber(amount, 2)} ${code} = ${formatNumber(rub, 2)} RUB`;
  }

  if (!Number.isFinite(rate.sell) || rate.sell <= 0) throw new Error(`Нет курса продажи для ${code}`);
  const foreign = amount / (rate.sell / units);
  return `${formatNumber(amount, 2)} RUB = ${formatNumber(foreign, 4)} ${code}`;
}

function safeEvaluate(expression) {
  const expr = expression.replace(/,/g, ".").trim();
  if (!/^[0-9+\-*/().%\s]*$/.test(expr)) {
    throw new Error("Разрешены только числа и символы + - * / % ( )");
  }
  if (!expr) throw new Error("Пустое выражение");

  // Evaluate only sanitized arithmetic expression.
  const fn = new Function(`return (${expr});`);
  const result = fn();
  if (!Number.isFinite(result)) {
    throw new Error("Некорректный результат");
  }
  return result;
}

function parseDecimal(value) {
  if (value == null) return NaN;
  const cleaned = String(value)
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : NaN;
}

function parseNumberInput(value) {
  if (!String(value).trim()) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function setStatus(message, kind) {
  els.ratesStatus.textContent = message;
  els.ratesStatus.classList.remove("ok", "warn");
  if (kind) els.ratesStatus.classList.add(kind);
}
