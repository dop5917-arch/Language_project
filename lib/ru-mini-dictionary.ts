export type RuDictionaryEntry = {
  word: string;
  variants: string[];
  parts: Array<{
    partOfSpeech: string;
    terms: string[];
  }>;
};

const EN_RU_MINI_DICTIONARY: Record<string, RuDictionaryEntry> = {
  bean: {
    word: "bean",
    variants: ["боб", "фасоль", "зерно бобовых"],
    parts: [{ partOfSpeech: "noun", terms: ["боб", "фасоль"] }]
  },
  recipe: {
    word: "recipe",
    variants: ["рецепт", "способ приготовления"],
    parts: [{ partOfSpeech: "noun", terms: ["рецепт", "кулинарный рецепт"] }]
  },
  puzzle: {
    word: "puzzle",
    variants: ["головоломка", "загадка", "задача"],
    parts: [
      { partOfSpeech: "noun", terms: ["головоломка", "загадка"] },
      { partOfSpeech: "verb", terms: ["ставить в тупик", "озадачивать"] }
    ]
  },
  ambiguous: {
    word: "ambiguous",
    variants: ["неоднозначный", "двусмысленный"],
    parts: [{ partOfSpeech: "adjective", terms: ["неоднозначный", "двусмысленный"] }]
  },
  detention: {
    word: "detention",
    variants: ["задержание", "оставление после уроков"],
    parts: [{ partOfSpeech: "noun", terms: ["задержание", "наказание после уроков"] }]
  },
  riddle: {
    word: "riddle",
    variants: ["загадка", "головоломка"],
    parts: [
      { partOfSpeech: "noun", terms: ["загадка"] },
      { partOfSpeech: "verb", terms: ["пронизать", "наделать отверстий"] }
    ]
  },
  distracting: {
    word: "distracting",
    variants: ["отвлекающий", "мешающий сосредоточиться"],
    parts: [{ partOfSpeech: "adjective", terms: ["отвлекающий", "мешающий"] }]
  },
  fairy: {
    word: "fairy",
    variants: ["фея", "сказочный"],
    parts: [{ partOfSpeech: "noun", terms: ["фея"] }]
  },
  story: {
    word: "story",
    variants: ["история", "рассказ", "сюжет"],
    parts: [{ partOfSpeech: "noun", terms: ["история", "рассказ"] }]
  },
  artifice: {
    word: "artifice",
    variants: ["уловка", "хитрость", "искусственный приём"],
    parts: [{ partOfSpeech: "noun", terms: ["уловка", "хитрость"] }]
  },
  manipulation: {
    word: "manipulation",
    variants: ["манипуляция", "управление", "воздействие"],
    parts: [{ partOfSpeech: "noun", terms: ["манипуляция", "скрытое влияние"] }]
  },
  abandon: {
    word: "abandon",
    variants: ["оставлять", "бросать", "покидать"],
    parts: [{ partOfSpeech: "verb", terms: ["оставлять", "бросать", "покидать"] }]
  },
  admit: {
    word: "admit",
    variants: ["признавать", "допускать", "впускать"],
    parts: [{ partOfSpeech: "verb", terms: ["признавать", "допускать"] }]
  },
  improve: {
    word: "improve",
    variants: ["улучшать", "совершенствовать"],
    parts: [{ partOfSpeech: "verb", terms: ["улучшать", "совершенствовать"] }]
  },
  avoid: {
    word: "avoid",
    variants: ["избегать", "уклоняться"],
    parts: [{ partOfSpeech: "verb", terms: ["избегать", "уклоняться"] }]
  },
  distract: {
    word: "distract",
    variants: ["отвлекать", "рассеивать внимание"],
    parts: [{ partOfSpeech: "verb", terms: ["отвлекать", "рассеивать внимание"] }]
  },
  challenge: {
    word: "challenge",
    variants: ["вызов", "сложная задача"],
    parts: [
      { partOfSpeech: "noun", terms: ["вызов", "сложность"] },
      { partOfSpeech: "verb", terms: ["бросать вызов", "оспаривать"] }
    ]
  },
  confidence: {
    word: "confidence",
    variants: ["уверенность", "доверие"],
    parts: [{ partOfSpeech: "noun", terms: ["уверенность", "доверие"] }]
  },
  focus: {
    word: "focus",
    variants: ["фокус", "внимание", "сосредоточенность"],
    parts: [
      { partOfSpeech: "noun", terms: ["фокус", "центр внимания"] },
      { partOfSpeech: "verb", terms: ["сосредоточиться", "фокусироваться"] }
    ]
  },
  context: {
    word: "context",
    variants: ["контекст", "окружение смысла"],
    parts: [{ partOfSpeech: "noun", terms: ["контекст"] }]
  }
};

const COMMON_WORD_VARIANTS: Record<string, string[]> = {
  time: ["время"],
  day: ["день"],
  week: ["неделя"],
  month: ["месяц"],
  year: ["год"],
  today: ["сегодня"],
  tomorrow: ["завтра"],
  yesterday: ["вчера"],
  morning: ["утро"],
  evening: ["вечер"],
  night: ["ночь"],
  people: ["люди"],
  person: ["человек"],
  friend: ["друг"],
  family: ["семья"],
  child: ["ребенок"],
  children: ["дети"],
  parent: ["родитель"],
  mother: ["мать"],
  father: ["отец"],
  brother: ["брат"],
  sister: ["сестра"],
  home: ["дом"],
  house: ["дом"],
  room: ["комната"],
  school: ["школа"],
  university: ["университет"],
  work: ["работа", "работать"],
  job: ["работа", "должность"],
  office: ["офис"],
  company: ["компания"],
  business: ["бизнес", "дело"],
  money: ["деньги"],
  price: ["цена"],
  cost: ["стоимость"],
  value: ["ценность", "значение"],
  market: ["рынок"],
  world: ["мир"],
  country: ["страна"],
  city: ["город"],
  town: ["городок"],
  street: ["улица"],
  road: ["дорога"],
  place: ["место"],
  area: ["область", "район"],
  water: ["вода"],
  food: ["еда"],
  bread: ["хлеб"],
  milk: ["молоко"],
  coffee: ["кофе"],
  tea: ["чай"],
  fruit: ["фрукт"],
  vegetable: ["овощ"],
  apple: ["яблоко"],
  book: ["книга"],
  text: ["текст"],
  word: ["слово"],
  sentence: ["предложение"],
  language: ["язык"],
  english: ["английский язык"],
  russian: ["русский язык"],
  question: ["вопрос"],
  answer: ["ответ"],
  idea: ["идея"],
  reason: ["причина"],
  result: ["результат"],
  problem: ["проблема"],
  solution: ["решение"],
  option: ["вариант"],
  choice: ["выбор"],
  example: ["пример"],
  case: ["случай"],
  level: ["уровень"],
  progress: ["прогресс"],
  goal: ["цель"],
  plan: ["план"],
  system: ["система"],
  process: ["процесс"],
  method: ["метод"],
  skill: ["навык"],
  practice: ["практика"],
  lesson: ["урок"],
  course: ["курс"],
  test: ["тест"],
  review: ["повторение", "обзор"],
  memory: ["память"],
  attention: ["внимание"],
  focus: ["фокус", "внимание"],
  sense: ["смысл", "чувство"],
  meaning: ["значение", "смысл"],
  translation: ["перевод"],
  dictionary: ["словарь"],
  image: ["изображение", "картинка"],
  picture: ["картинка", "изображение"],
  sound: ["звук"],
  voice: ["голос"],
  audio: ["аудио"],
  video: ["видео"],
  computer: ["компьютер"],
  phone: ["телефон"],
  app: ["приложение"],
  button: ["кнопка"],
  screen: ["экран"],
  page: ["страница"],
  menu: ["меню"],
  window: ["окно"],
  line: ["линия", "строка"],
  table: ["таблица"],
  card: ["карточка"],
  deck: ["колода"],
  queue: ["очередь"],
  rating: ["оценка"],
  difficult: ["сложный", "трудный"],
  easy: ["легкий", "простой"],
  hard: ["трудный", "сложный"],
  good: ["хороший"],
  again: ["снова"],
  learned: ["изученный", "выученный"],
  forget: ["забывать"],
  remember: ["помнить", "запоминать"],
  understand: ["понимать"],
  know: ["знать"],
  think: ["думать"],
  learn: ["учить", "изучать"],
  study: ["учиться", "изучать"],
  read: ["читать"],
  write: ["писать"],
  speak: ["говорить"],
  say: ["сказать", "говорить"],
  tell: ["рассказывать", "сообщать"],
  ask: ["спрашивать"],
  show: ["показывать"],
  open: ["открывать"],
  close: ["закрывать"],
  start: ["начинать"],
  finish: ["заканчивать"],
  continue: ["продолжать"],
  stop: ["останавливаться", "останавливать"],
  try: ["пытаться", "пробовать"],
  use: ["использовать"],
  make: ["делать", "создавать"],
  create: ["создавать"],
  build: ["строить", "создавать"],
  change: ["изменять", "изменение"],
  update: ["обновлять", "обновление"],
  add: ["добавлять"],
  remove: ["удалять"],
  delete: ["удалять"],
  save: ["сохранять"],
  load: ["загружать"],
  move: ["двигать", "перемещать"],
  next: ["следующий"],
  previous: ["предыдущий"],
  first: ["первый"],
  last: ["последний"],
  best: ["лучший"],
  better: ["лучше", "лучший"],
  important: ["важный"],
  common: ["распространенный", "общий"],
  popular: ["популярный"],
  simple: ["простой"],
  clear: ["ясный", "понятный"],
  correct: ["правильный"],
  wrong: ["неправильный"],
  true: ["верный", "правда"],
  false: ["ложный"],
  small: ["маленький"],
  big: ["большой"],
  long: ["длинный", "долго"],
  short: ["короткий"],
  high: ["высокий"],
  low: ["низкий"],
  early: ["рано", "ранний"],
  late: ["поздно", "поздний"],
  fast: ["быстрый", "быстро"],
  slow: ["медленный", "медленно"],
  new: ["новый"],
  old: ["старый"],
  young: ["молодой"],
  right: ["правильный", "право"],
  left: ["левый", "налево"],
  strong: ["сильный"],
  weak: ["слабый"],
  happy: ["счастливый"],
  sad: ["грустный"],
  free: ["свободный", "бесплатный"],
  busy: ["занятый"],
  ready: ["готовый"],
  sure: ["уверенный"],
  maybe: ["возможно", "может быть"],
  please: ["пожалуйста"],
  thanks: ["спасибо"],
  hello: ["привет", "здравствуйте"],
  goodbye: ["до свидания", "пока"]
};

export function getLocalRuDictionary(wordRaw: string): RuDictionaryEntry | null {
  const key = wordRaw.trim().toLowerCase();
  const strict = EN_RU_MINI_DICTIONARY[key];
  if (strict) return strict;

  const common = COMMON_WORD_VARIANTS[key];
  if (!common || common.length === 0) return null;
  return {
    word: key,
    variants: common,
    parts: [{ partOfSpeech: "word", terms: common.slice(0, 6) }]
  };
}
