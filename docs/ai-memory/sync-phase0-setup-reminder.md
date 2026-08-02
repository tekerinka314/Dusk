---
name: sync-phase0-setup-reminder
description: "⏰ НАПОМНИТЬ пользователю ПЕРЕД Фазой 2 синка: настроить GitHub Pages + Google Cloud OAuth (он делает руками). Пошаговая инструкция тут."
metadata: 
  node_type: memory
  type: project
  originSessionId: 0a1e223e-b6d1-498e-a433-745713f8b509
---

⏰ **ТРИГГЕР: как только Фаза 1 (движок мержа) готова и собираемся начинать Фазу 2
(Drive-клиент/OAuth) — НАПОМНИТЬ пользователю сделать настройку ниже руками.** Без неё
Фаза 2 не тестируется (OAuth нельзя с `file://`). Сейчас (Фаза 1) НЕ нужно. См.
[[sync-merge-decisions]], [[sync-plan-web-first]].

## Шаги (пользователь делает сам, Claude сопровождает)

### A. GitHub Pages (хостинг, нужен https-origin для OAuth)
1. GitHub → репо `tekerinka314/Dusk` → **Settings → Pages**.
2. Source = **Deploy from a branch**. Ветку решить: `master` (после мержа `refactor/sync`)
   или временно `refactor/sync` для dev. Folder = `/ (root)`.
3. Сохранить. URL будет `https://tekerinka314.github.io/Dusk/`.
4. Проверить: сайт открывается, Service Worker регистрируется под подпутём `/Dusk/`
   (пути должны быть относительные `./`). Claude проверит SW перед Фазой 2.

### B. Google Cloud Console (OAuth + Drive API)
1. https://console.cloud.google.com → **новый проект** (имя любое, напр. "DUSK Sync").
2. **APIs & Services → Library → включить "Google Drive API"**.
3. **APIs & Services → OAuth consent screen**: тип **External**, статус **Testing**.
   Заполнить имя приложения + email. В **Test users** добавить свой email
   (petrehundima@gmail.com) + друзей-тестеров. (Экран "app isn't verified" — норм для
   Testing.)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type = **Web application**.
   - **Authorized JavaScript origins**: `https://tekerinka314.github.io`
     (+ `http://localhost:PORT` для dev-песочницы).
   - Создать → скопировать **Client ID** (публичный, можно в код).
   - **client_secret НЕ нужен** (browser token-flow / Google Identity Services).
5. Отдать Claude: Client ID + финальный Pages URL.

### Scope для кода (Фаза 2)
`https://www.googleapis.com/auth/drive.appdata` — приватная папка appDataFolder (невидима
в UI Диска, бесплатно). Файл синка: `dusk-sync.json`.

## Статус
**✅ SETUP СДЕЛАН 2026-06-28.** Пользователь настроил Google Cloud (проект без организации,
Drive API on, OAuth consent External/Testing + тест-юзер petrehundima@gmail.com, scope
drive.appdata, Web OAuth client). **Client ID получен:**
`493121023118-pln1rmhl37q3qi915jhbaqt57a7dkdtv.apps.googleusercontent.com`. GitHub Pages: репо
делается публичным (бесплатный Pages), публикация с ветки `refactor/sync`, URL
`https://tekerinka314.github.io/Dusk/`. Origins зарегистрированы: github.io + `http://localhost`
(если localhost OAuth откажет — добавить точный порт). Детали кодинга → `SYNC-SPEC-PHASE2.md` +
[[sync-phase2-ready]]. Напоминалка ОТРАБОТАЛА — дальше Фаза 2 (код после compact).
