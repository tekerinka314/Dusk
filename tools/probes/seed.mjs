// B1 mobile audit — rich + perf seed states (NEVER the user's real data).
// Shapes verified against dusk/01-core.ts migrateTasks + 06-deadlines.ts (2026-07-07).
const D = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toISOString().slice(0, 10); };
const now = Date.now();
let _s = 500;
const sub = (text, o = {}) => ({
  id: _s++, uid: 'su' + _s, text, checked: false, priority: 'none', repeat: 'none',
  note: '', order: 0, cycleChecked: false, updatedAt: now, deadline: null, ...o,
});
const task = (id, text, o = {}) => ({
  id, uid: 'u' + id, text, checked: false, priority: 'none', groupId: null, deadline: null,
  note: '', noteOpen: false, order: id, repeat: 'none', cycleChecked: false, nextReset: null,
  subtasks: [], subtasksOpen: false, subNotesAlwaysOpen: false, pinned: false, color: null,
  createdAt: now, updatedAt: now, ...o,
});

export function richSeed() {
  const groups = [
    { id: 10, uid: 'g10', name: 'Ритуалы ночи', color: '#8C5CFF', order: 0, collapsed: false, createdAt: now, updatedAt: now },
    { id: 11, uid: 'g11', name: 'Работа', color: '#B5476B', order: 1, collapsed: false, createdAt: now, updatedAt: now },
    { id: 12, uid: 'g12', name: 'Дом и очень длинное имя группы для проверки переноса', color: '#4E8C6A', order: 2, collapsed: false, createdAt: now, updatedAt: now },
  ];
  const tasks = [
    task(1, 'Зажечь чёрные свечи перед алтарём', {
      groupId: 10, priority: 'high', pinned: true, color: '#8C5CFF',
      deadline: { mode: 'date', value: D(2), time: '18:30' },
      note: 'Свечи должны быть освящены.', noteOpen: true,
      subtasks: [sub('Достать свечи из склепа', { checked: true }), sub('Начертить пентаграмму'), sub('Прочитать заклинание'), sub('Погасить свет')],
      subtasksOpen: true,
    }),
    task(2, 'Просрочённый ритуал — должен гореть красным', {
      groupId: 10, priority: 'high',
      deadline: { mode: 'date', value: D(-1), time: '09:00' },
    }),
    task(3, 'Ежедневная медитация в полночь', {
      groupId: 10, priority: 'medium', repeat: 'daily',
      deadline: { mode: 'time', value: '23:45' },
      cycleChecked: true, checked: false, nextReset: now + 3600_000,
    }),
    task(4, 'Еженедельный совет теней', {
      groupId: 11, priority: 'medium', repeat: 'weekly', repeatAnchorDay: 3,
      deadline: { mode: 'weektime', value: '3|09:00', timeSet: true },
    }),
    task(5, 'Отчёт кровью 15-го числа', {
      groupId: 11, priority: 'low', repeat: 'monthly', repeatAnchorMonthday: 15,
      deadline: { mode: 'monthday', value: '15' },
      color: '#B5476B',
    }),
    task(6, 'Великое затмение (месяц)', {
      groupId: 11, deadline: { mode: 'month', value: String((new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2)) },
      priority: 'none',
    }),
    task(7, 'Пробуждение древнего (год)', {
      groupId: 12, deadline: { mode: 'year', value: String(new Date().getFullYear() + 1) },
      priority: 'low',
    }),
    task(8, 'Очень длинный текст задачи который должен проверить перенос строк и обрезание overflow на узком мобильном экране в 360 пикселей ширины и не сломать карточку', {
      groupId: 12, priority: 'high', color: '#4E8C6A',
    }),
    task(9, 'Задача со множеством подзадач (2-колоночная сетка)', {
      groupId: null, priority: 'medium',
      subtasks: [sub('первая'), sub('вторая', { checked: true }), sub('третья'), sub('четвёртая', { checked: true }), sub('пятая'), sub('шестая'), sub('седьмая с очень длинным текстом подзадачи для теста', { priority: 'high' }), sub('восьмая')],
      subtasksOpen: true,
    }),
    task(10, 'Задача с заметкой в окне', {
      groupId: null, priority: 'none', note: 'Это заметка задачи, открытая инлайн под карточкой.', noteOpen: true,
    }),
    task(11, 'Закреплённая без группы', { pinned: true, priority: 'low' }),
    task(12, 'Обычная задача без ничего', { groupId: null }),
    task(13, 'Задача с подзадачей-дедлайном', {
      groupId: 11, priority: 'medium',
      subtasks: [sub('подзадача с дедлайном', { deadline: { mode: 'date', value: D(1) } }), sub('обычная подзадача')],
      subtasksOpen: true,
    }),
    task(14, 'Выполненная задача', { checked: true, priority: 'low', groupId: 10 }),
  ];
  const archive = [
    { ...task(90, 'Похороненная задача', { groupId: 10, checked: true, subtasks: [sub('с подпунктом', { checked: true })], subtasksOpen: true }), archivedAt: now - 86400000 },
    { ...task(91, 'Старый ритуал в архиве', { checked: true, priority: 'high' }), archivedAt: now - 3 * 86400000 },
  ];
  const notes = [
    { id: 'n1', title: 'Заклинание вызова', body: '<h2>Ритуал</h2><p>Первая строка заметки с <b>жирным</b> и <i>курсивом</i> текстом.</p><ul><li>ингредиент один</li><li>ингредиент два</li></ul>', fmt: true, color: '#8C5CFF', createdAt: now, updatedAt: now },
    { id: 'n2', title: 'Список дел на шабаш', body: '<p>Чеклист:</p><ul data-checklist="1"><li data-checked="true">купить свечи</li><li>найти котёл</li><li>призвать фамильяра</li></ul>', fmt: true, color: null, createdAt: now, updatedAt: now - 1000 },
    { id: 'n3', title: 'Таблица жертв', body: '<table><thead><tr><th>Имя</th><th>Дата</th></tr></thead><tbody><tr><td>Азраил</td><td>полнолуние</td></tr><tr><td>Лилит</td><td>затмение</td></tr></tbody></table>', fmt: true, color: '#B5476B', createdAt: now, updatedAt: now - 2000 },
    { id: 'n4', title: 'Код заклинания', body: '<pre><code>function summon(demon) {\n  return ritual.invoke(demon);\n}</code></pre>', fmt: true, color: null, createdAt: now, updatedAt: now - 3000 },
    { id: 'n5', title: 'Предупреждение', body: '<div class="grim-callout" data-variant="warn"><p>Не читать вслух после полуночи.</p></div>', fmt: true, color: null, createdAt: now, updatedAt: now - 4000 },
    { id: 'n6', title: 'Очень длинная заметка', body: '<p>' + 'Тьма сгущается над башней. '.repeat(60) + '</p>', fmt: true, color: null, createdAt: now, updatedAt: now - 5000 },
    { id: 'n7', title: '', body: '<p>Заметка без заголовка.</p>', fmt: true, color: null, createdAt: now, updatedAt: now - 6000 },
    { id: 'n8', title: 'Простой текст', body: '<p>Одна строка.</p>', fmt: true, color: '#4E8C6A', createdAt: now, updatedAt: now - 7000 },
  ];
  const notesArchive = [
    { id: 'na1', title: 'Забытое пророчество', body: '<p>Погребено в склепе.</p>', fmt: true, color: null, createdAt: now, updatedAt: now, archivedAt: now - 86400000 },
    { id: 'na2', title: 'Старая руна', body: '<p>Стёрта временем.</p>', fmt: true, color: null, createdAt: now, updatedAt: now, archivedAt: now - 2 * 86400000 },
  ];
  return {
    tasks, groups, archive, notes, notesArchive, tombstones: [],
    templates: [{ id: 't1', uid: 'tpl1', name: 'Шаблон ритуала', priority: 'high', color: '#8C5CFF', subtasks: ['шаг 1', 'шаг 2'] }],
    nextId: 100, nextGroupId: 20, nextSubId: 900,
    sortMode: 'priority', sortModeOverrides: {}, subAnyMode: false,
  };
}

export function perfSeed(n) {
  const groups = [{ id: 10, uid: 'g10', name: 'Массив', color: '#8C5CFF', order: 0, collapsed: false, createdAt: now, updatedAt: now }];
  const tasks = [];
  for (let i = 1; i <= n; i++) {
    tasks.push(task(i, 'Задача №' + i + ' в большом списке для нагрузочного теста', {
      groupId: i % 3 === 0 ? 10 : null,
      priority: ['none', 'low', 'medium', 'high'][i % 4],
      checked: i % 7 === 0,
      deadline: i % 5 === 0 ? { mode: 'date', value: D(i % 30) } : null,
      subtasks: i % 4 === 0 ? [sub('под-a'), sub('под-b', { checked: true })] : [],
      subtasksOpen: i % 8 === 0,
    }));
  }
  return {
    tasks, groups, archive: [], notes: [], notesArchive: [], tombstones: [], templates: [],
    nextId: n + 1, nextGroupId: 20, nextSubId: 900 + n * 2,
    sortMode: 'priority', sortModeOverrides: {}, subAnyMode: false,
  };
}
