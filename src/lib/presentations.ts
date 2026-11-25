export interface InteractiveLessonDeck {
  lesson: number;
  title: string;
  objectives: string[];
  url: string;
}

const G7_FMT_SLUG = "g7-formaty-dannykh-v-elektronnykh-tablitsakh";
const G7_FN_SLUG = "g7-ispolzovanie-vstroennykh-funktsiy-v-elektronnykh-tablitsakh-summativnoe-otsenivanie-7-2a";
const G7_BD_SLUG = "g7-baza-dannykh";
const G7_SF_SLUG = "g7-sortirovka-i-filtratsiya-dannykh";
const G7_BRANCH_FC_SLUG = "g7-blok-skhema-razvetvlyayushchegosya-algoritma";
const G7_BRANCH_CODE_SLUG = "g7-programmirovanie-razvetvlyayushchegosya-algoritma";
const G7_COMPOUND_SLUG = "g7-sostavnye-usloviya-summativnoe-otsenivanie-po-razdelu-7-3v";
const G7_BS_SLUG = "g7-blok-skhemy-lineynykh-algoritmov";
const G7_SP_SLUG = "g7-struktura-programmy-lineynykh-algoritmov";
const G7_TD_SLUG = "g7-tipy-dannykh";
const G7_TDS_SLUG = "g7-tipy-dannykh-summativnoe-otsenivanie-po-razdelu-7-3a";
const G8_MEM_SLUG = "g8-kompyuternaya-pamyat";
const G8_OS_SLUG = "g8-operatsionnye-sistemy";
const G8_MEDIA_SLUG = "g8-predstavlenie-graficheskikh-i-audio-faylov";
const G8_ARR_SLUG = "g8-odnomernye-massivy";
const G8_ARR_IO_SLUG = "g8-zapolnenie-massiva-i-vyvod-na-ekran";
const G8_ALG_SLUG = "g8-tipy-algoritmov";
const G8_WHILE_SLUG = "g8-programmirovanie-tsiklicheskikh-algoritmov-s-predusloviem";
const G8_FOR_SLUG = "g8-programmirovanie-tsiklicheskikh-algoritmov-so-schetchikom";
const G9_DB1_SLUG = "g9-osnovnye-ponyatiya-i-sozdanie-odnotablichnykh-bd";
const G9_DB2_SLUG = "g9-sozdanie-mnogotablichnykh-bd-i-otchetov";
const G9_ARR_SLUG = "g9-vlozhennye-tsikly-i-dvumernye-massivy";
const G10_HTML_SLUG = "g10-osnovnye-tegi-html-struktura-dokumenta-i-verstka";
const G10_OOP_SLUG = "g10-osnovnye-ponyatiya-oop-i-interfeys-prilozheniy";
const G10_APP_SLUG = "g10-programmirovanie-usloviy-i-multimedia";

const PRESENTATIONS_BY_TOPIC: Record<string, InteractiveLessonDeck[]> = {
  [G7_FMT_SLUG]: [
    {
      lesson: 1,
      title: "Электронная таблица. Типы и форматы данных",
      objectives: ["7.1.1.1"],
      url: `/presentations/${G7_FMT_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Формулы, маркер заполнения и функции СУММ, СРЗНАЧ, МИН, МАКС",
      objectives: ["7.1.1.1", "7.1.1.2"],
      url: `/presentations/${G7_FMT_SLUG}/lesson-2.html`,
    },
  ],
  [G7_FN_SLUG]: [
    {
      lesson: 1,
      title: "Функция ЕСЛИ. Относительные и абсолютные ссылки ($A$1)",
      objectives: ["7.1.1.3", "7.4.2.1"],
      url: `/presentations/${G7_FN_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Логические функции И, ИЛИ, НЕ. Смешанные ссылки ($A1, A$1)",
      objectives: ["7.1.1.3", "7.4.2.1"],
      url: `/presentations/${G7_FN_SLUG}/lesson-2.html`,
    },
    {
      lesson: 3,
      title: "Функции СЧЁТЕСЛИ и СУММЕСЛИ. Ошибки формул и СОР 7.2А",
      objectives: ["7.1.1.3", "7.4.2.3"],
      url: `/presentations/${G7_FN_SLUG}/lesson-3.html`,
    },
  ],
  [G7_BD_SLUG]: [
    {
      lesson: 1,
      title: "База данных. Табличная модель",
      objectives: ["7.1.2.1"],
      url: `/presentations/${G7_BD_SLUG}/lesson-1.html`,
    },
  ],
  [G7_SF_SLUG]: [
    {
      lesson: 1,
      title: "Сортировка и фильтрация данных в электронных таблицах",
      objectives: ["7.1.2.2"],
      url: `/presentations/${G7_SF_SLUG}/lesson-1.html`,
    },
  ],
  [G7_BRANCH_FC_SLUG]: [
    {
      lesson: 1,
      title: "Блок-схема разветвляющегося алгоритма",
      objectives: ["7.4.1.2"],
      url: `/presentations/${G7_BRANCH_FC_SLUG}/lesson-1.html`,
    },
  ],
  [G7_BRANCH_CODE_SLUG]: [
    {
      lesson: 1,
      title: "Программирование разветвляющегося алгоритма (if … else)",
      objectives: ["7.4.3.6"],
      url: `/presentations/${G7_BRANCH_CODE_SLUG}/lesson-1.html`,
    },
  ],
  [G7_COMPOUND_SLUG]: [
    {
      lesson: 1,
      title: "Составные условия. СОР 7.3В",
      objectives: ["7.4.2.2"],
      url: `/presentations/${G7_COMPOUND_SLUG}/lesson-1.html`,
    },
  ],
  [G7_BS_SLUG]: [
    {
      lesson: 1,
      title: "Алгоритм. Виды алгоритмов. Блок-схемы линейных алгоритмов",
      objectives: ["7.4.1.1"],
      url: `/presentations/${G7_BS_SLUG}/lesson-1.html`,
    },
  ],
  [G7_SP_SLUG]: [
    {
      lesson: 1,
      title: "Знакомство с C++. Структура программы",
      objectives: ["7.4.3.1"],
      url: `/presentations/${G7_SP_SLUG}/lesson-1.html`,
    },
  ],
  [G7_TD_SLUG]: [
    {
      lesson: 1,
      title: "Переменные и константы. Типы данных",
      objectives: ["7.4.3.2"],
      url: `/presentations/${G7_TD_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Ввод и вывод данных. Диалог с пользователем",
      objectives: ["7.4.3.2", "7.4.3.3"],
      url: `/presentations/${G7_TD_SLUG}/lesson-2.html`,
    },
  ],
  [G7_TDS_SLUG]: [
    {
      lesson: 1,
      title: "Математика в программировании. Арифметические выражения",
      objectives: ["7.4.3.4", "7.4.3.5"],
      url: `/presentations/${G7_TDS_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Программирование линейных алгоритмов. Повторение. СОР 7.3А",
      objectives: ["7.4.3.4", "7.4.3.5"],
      url: `/presentations/${G7_TDS_SLUG}/lesson-2.html`,
    },
  ],
  [G8_MEM_SLUG]: [
    {
      lesson: 1,
      title: "Архитектура фон Неймана. Виды компьютерной памяти",
      objectives: ["8.3.1.1", "8.3.1.2"],
      url: `/presentations/${G8_MEM_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Оперативная и постоянная память. Иерархия памяти",
      objectives: ["8.3.1.2"],
      url: `/presentations/${G8_MEM_SLUG}/lesson-2.html`,
    },
  ],
  [G8_OS_SLUG]: [
    {
      lesson: 1,
      title: "Операционные системы: назначение и функции",
      objectives: ["8.3.2.1"],
      url: `/presentations/${G8_OS_SLUG}/lesson-1.html`,
    },
  ],
  [G8_MEDIA_SLUG]: [
    {
      lesson: 1,
      title: "Представление растровых изображений и звука в двоичном виде. Принципы сжатия",
      objectives: ["8.1.1.4"],
      url: `/presentations/${G8_MEDIA_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Измерение графической информации",
      objectives: ["8.1.1.6"],
      url: `/presentations/${G8_MEDIA_SLUG}/lesson-2.html`,
    },
    {
      lesson: 3,
      title: "Измерение звуковой информации",
      objectives: ["8.1.1.7"],
      url: `/presentations/${G8_MEDIA_SLUG}/lesson-3.html`,
    },
  ],
  [G8_ARR_SLUG]: [
    {
      lesson: 1,
      title: "Структуры данных. Назначение массива",
      objectives: ["8.4.3.5"],
      url: `/presentations/${G8_ARR_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Объявление одномерного массива в C++",
      objectives: ["8.4.3.6"],
      url: `/presentations/${G8_ARR_SLUG}/lesson-2.html`,
    },
  ],
  [G8_ARR_IO_SLUG]: [
    {
      lesson: 1,
      title: "Заполнение элементов одномерного массива",
      objectives: ["8.4.3.7"],
      url: `/presentations/${G8_ARR_IO_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Вывод элементов одномерного массива на экран",
      objectives: ["8.4.3.8"],
      url: `/presentations/${G8_ARR_IO_SLUG}/lesson-2.html`,
    },
  ],
  [G8_ALG_SLUG]: [
    {
      lesson: 1,
      title: "Классификация типов данных. Числовые, символьные, строковые и логические типы",
      objectives: ["8.4.3.1"],
      url: `/presentations/${G8_ALG_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Линейные и разветвляющиеся алгоритмы при решении задач",
      objectives: ["8.4.1.1"],
      url: `/presentations/${G8_ALG_SLUG}/lesson-2.html`,
    },
  ],
  [G8_WHILE_SLUG]: [
    {
      lesson: 1,
      title: "Построение блок-схем циклических алгоритмов. Цикл с предусловием while",
      objectives: ["8.4.1.2", "8.4.3.3", "8.4.3.2"],
      url: `/presentations/${G8_WHILE_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Трассировка циклических алгоритмов. Цикл while при решении математических задач",
      objectives: ["8.4.3.2", "8.4.3.3"],
      url: `/presentations/${G8_WHILE_SLUG}/lesson-2.html`,
    },
    {
      lesson: 3,
      title: "Цикл с предусловием while при решении задач по физике",
      objectives: ["8.4.3.3", "8.4.3.2"],
      url: `/presentations/${G8_WHILE_SLUG}/lesson-3.html`,
    },
  ],
  [G8_FOR_SLUG]: [
    {
      lesson: 1,
      title: "Программирование циклических алгоритмов со счётчиком. Операторы break и continue",
      objectives: ["8.4.3.4"],
      url: `/presentations/${G8_FOR_SLUG}/lesson-1.html`,
    },
  ],
  [G9_DB1_SLUG]: [
    {
      lesson: 1,
      title: "Базы данных и СУБД. Таблица, поле, запись, типы данных и ключ",
      objectives: ["9.1.2.1", "9.1.2.2", "9.1.2.4"],
      url: `/presentations/${G9_DB1_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Проектирование и создание однотабличной БД в СУБД Access",
      objectives: ["9.1.2.3", "9.1.2.2", "9.1.2.4"],
      url: `/presentations/${G9_DB1_SLUG}/lesson-2.html`,
    },
    {
      lesson: 3,
      title: "Маски ввода, свойства полей и Мастер подстановок в СУБД",
      objectives: ["9.1.2.3"],
      url: `/presentations/${G9_DB1_SLUG}/lesson-3.html`,
    },
    {
      lesson: 4,
      title: "Создание форм и использование элементов управления в СУБД",
      objectives: ["9.1.2.3"],
      url: `/presentations/${G9_DB1_SLUG}/lesson-4.html`,
    },
    {
      lesson: 5,
      title: "Сортировка и фильтрация данных в базах данных",
      objectives: ["9.1.2.6"],
      url: `/presentations/${G9_DB1_SLUG}/lesson-5.html`,
    },
    {
      lesson: 6,
      title: "Запросы на выборку в Конструкторе. Обобщение и СОР 9.2А",
      objectives: ["9.1.2.7", "9.1.2.6", "9.1.2.3"],
      url: `/presentations/${G9_DB1_SLUG}/lesson-6.html`,
    },
  ],
  [G9_DB2_SLUG]: [
    {
      lesson: 1,
      title: "Многотабличные БД. Первичный, составной и внешний ключи, связи",
      objectives: ["9.1.2.8", "9.1.2.9"],
      url: `/presentations/${G9_DB2_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Создание многотабличной БД и Схемы данных в СУБД Access",
      objectives: ["9.1.2.8", "9.1.2.9"],
      url: `/presentations/${G9_DB2_SLUG}/lesson-2.html`,
    },
    {
      lesson: 3,
      title: "Запросы на выборку, с параметром и на изменение в многотабличной БД",
      objectives: ["9.1.2.11"],
      url: `/presentations/${G9_DB2_SLUG}/lesson-3.html`,
    },
    {
      lesson: 4,
      title: "Создание отчётов в СУБД. Обобщение и подготовка к СОР 9.2B",
      objectives: ["9.1.2.12", "9.1.2.8", "9.1.2.11"],
      url: `/presentations/${G9_DB2_SLUG}/lesson-4.html`,
    },
  ],
  [G9_ARR_SLUG]: [
    {
      lesson: 1,
      title: "Вложенные циклы: понятие, структура и применение",
      objectives: ["9.4.1.1", "9.4.3.1"],
      url: `/presentations/${G9_ARR_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Трассировка алгоритмов с вложенными циклами",
      objectives: ["9.4.3.1"],
      url: `/presentations/${G9_ARR_SLUG}/lesson-2.html`,
    },
    {
      lesson: 3,
      title: "Вложенные циклы и условия: фигуры, «счастливые» билеты",
      objectives: ["9.4.1.1", "9.4.3.1"],
      url: `/presentations/${G9_ARR_SLUG}/lesson-3.html`,
    },
    {
      lesson: 4,
      title: "Двумерный массив: назначение, индексация, объявление",
      objectives: ["9.4.3.3", "9.4.3.4"],
      url: `/presentations/${G9_ARR_SLUG}/lesson-4.html`,
    },
    {
      lesson: 5,
      title: "Заполнение и табличный вывод двумерного массива",
      objectives: ["9.4.3.5", "9.4.3.6"],
      url: `/presentations/${G9_ARR_SLUG}/lesson-5.html`,
    },
    {
      lesson: 6,
      title: "Сумма и произведение элементов двумерного массива",
      objectives: ["9.4.3.7"],
      url: `/presentations/${G9_ARR_SLUG}/lesson-6.html`,
    },
    {
      lesson: 7,
      title: "Отбор элементов по критериям. Диагонали, минимум и максимум",
      objectives: ["9.4.3.8", "9.4.1.1"],
      url: `/presentations/${G9_ARR_SLUG}/lesson-7.html`,
    },
    {
      lesson: 8,
      title: "Комплексная обработка двумерных массивов. Подготовка к СОР",
      objectives: ["9.4.1.1", "9.4.3.1", "9.4.3.3", "9.4.3.4", "9.4.3.5", "9.4.3.6", "9.4.3.7", "9.4.3.8"],
      url: `/presentations/${G9_ARR_SLUG}/lesson-8.html`,
    },
  ],
  [G10_HTML_SLUG]: [
    {
      lesson: 1,
      title: "Язык разметки HTML и структура HTML-документа",
      objectives: ["10.1.2.2", "10.1.2.5"],
      url: `/presentations/${G10_HTML_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Заголовки <h1>–<h6>, абзацы <p>, <br>, <hr> и их атрибуты",
      objectives: ["10.1.2.4", "10.1.2.5"],
      url: `/presentations/${G10_HTML_SLUG}/lesson-2.html`,
    },
    {
      lesson: 3,
      title: "Форматирование текста и шрифта: физическое и логическое",
      objectives: ["10.1.2.3", "10.1.2.5"],
      url: `/presentations/${G10_HTML_SLUG}/lesson-3.html`,
    },
    {
      lesson: 4,
      title: "Списки в HTML: нумерованные, маркированные и вложенные",
      objectives: ["10.1.2.4", "10.1.2.5"],
      url: `/presentations/${G10_HTML_SLUG}/lesson-4.html`,
    },
    {
      lesson: 5,
      title: "Гиперссылки: внешние, локальные, закладки-якоря и картинки",
      objectives: ["10.1.2.6", "10.1.2.5"],
      url: `/presentations/${G10_HTML_SLUG}/lesson-5.html`,
    },
    {
      lesson: 6,
      title: "Мультимедиа (<img>, <audio>, <video>) и авторские права",
      objectives: ["10.1.2.7", "10.1.2.5"],
      url: `/presentations/${G10_HTML_SLUG}/lesson-6.html`,
    },
    {
      lesson: 7,
      title: "Таблицы в HTML: <table>, <caption>, <tr>, <th>, <td>",
      objectives: ["10.1.2.8", "10.1.2.5"],
      url: `/presentations/${G10_HTML_SLUG}/lesson-7.html`,
    },
    {
      lesson: 8,
      title: "Объединение ячеек по горизонтали (colspan) и вертикали (rowspan)",
      objectives: ["10.1.2.9", "10.1.2.8"],
      url: `/presentations/${G10_HTML_SLUG}/lesson-8.html`,
    },
    {
      lesson: 9,
      title: "Каскадные таблицы стилей CSS: подключение, селекторы, свойства",
      objectives: ["10.1.2.10", "10.1.2.11"],
      url: `/presentations/${G10_HTML_SLUG}/lesson-9.html`,
    },
    {
      lesson: 10,
      title: "Блочная и табличная вёрстка (<div>, HTML5) и обобщение 10.2А",
      objectives: ["10.1.2.10", "10.1.2.11"],
      url: `/presentations/${G10_HTML_SLUG}/lesson-10.html`,
    },
  ],
  [G10_OOP_SLUG]: [
    {
      lesson: 1,
      title: "Основные понятия ООП: класс, объект, свойство, метод, событие",
      objectives: ["10.4.3.1"],
      url: `/presentations/${G10_OOP_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Основы C#: идентификаторы, типы данных, константы, операции",
      objectives: ["10.4.3.1", "10.4.3.4"],
      url: `/presentations/${G10_OOP_SLUG}/lesson-2.html`,
    },
    {
      lesson: 3,
      title: "Visual Studio (Windows Forms): компоненты, свойства и события",
      objectives: ["10.4.3.2", "10.4.3.7"],
      url: `/presentations/${G10_OOP_SLUG}/lesson-3.html`,
    },
    {
      lesson: 4,
      title: "Преобразование типов данных и расчётные приложения",
      objectives: ["10.4.3.4", "10.4.3.2", "10.4.3.7"],
      url: `/presentations/${G10_OOP_SLUG}/lesson-4.html`,
    },
    {
      lesson: 5,
      title: "Условный оператор if … else. Обобщение раздела 10.3А",
      objectives: ["10.4.3.10", "10.4.3.1", "10.4.3.2", "10.4.3.4", "10.4.3.7"],
      url: `/presentations/${G10_OOP_SLUG}/lesson-5.html`,
    },
  ],
  [G10_APP_SLUG]: [
    {
      lesson: 1,
      title: "Языки программирования, события и массивы в C#",
      objectives: ["10.4.3.12"],
      url: `/presentations/${G10_APP_SLUG}/lesson-1.html`,
    },
    {
      lesson: 2,
      title: "Обработка массивов: сумма, количество, поиск (DataGridView)",
      objectives: ["10.4.3.12", "10.4.3.14"],
      url: `/presentations/${G10_APP_SLUG}/lesson-2.html`,
    },
    {
      lesson: 3,
      title: "Циклы while, do…while, for и компонент ListBox",
      objectives: ["10.4.3.12", "10.4.3.14"],
      url: `/presentations/${G10_APP_SLUG}/lesson-3.html`,
    },
    {
      lesson: 4,
      title: "RadioButton и CheckBox: свойства и ветвление",
      objectives: ["10.4.3.13", "10.4.3.14"],
      url: `/presentations/${G10_APP_SLUG}/lesson-4.html`,
    },
    {
      lesson: 5,
      title: "Базы данных и мультимедиа в приложениях C#. Обобщение 10.3В",
      objectives: ["10.4.3.12", "10.4.3.15", "10.4.3.16"],
      url: `/presentations/${G10_APP_SLUG}/lesson-5.html`,
    },
  ],
};

export function getTopicPresentations(slug: string): InteractiveLessonDeck[] {
  return PRESENTATIONS_BY_TOPIC[slug] ?? [];
}
