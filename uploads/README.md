# Система пересдач МИРЭА

Веб-платформа для организации академических пересдач в РТУ МИРЭА. Объединяет личный кабинет студента (LKS), портал преподавателей и сотрудников (LKP) и REST API.

---

## Содержание

1. [Архитектура системы](#архитектура-системы)
2. [База данных и сущности](#база-данных-и-сущности)
3. [Аутентификация и SSO](#аутентификация-и-sso)
4. [Роли пользователей](#роли-пользователей)
5. [Полный процесс организации пересдачи](#полный-процесс-организации-пересдачи)
6. [Портал преподавателей и сотрудников (LKP)](#портал-преподавателей-и-сотрудников-lkp)
7. [Личный кабинет студента (LKS)](#личный-кабинет-студента-lks)
8. [API — справочник эндпоинтов](#api--справочник-эндпоинтов)
9. [Интеграция с МИРЭА ЛК](#интеграция-с-мирэа-лк)
10. [Интеграция с расписанием МИРЭА](#интеграция-с-расписанием-мирэа)
11. [Структура проекта](#структура-проекта)
12. [Запуск и разработка](#запуск-и-разработка)

---

## Архитектура системы

### Обзор

Система является **монорепозиторием** (`pnpm workspaces` + `Turborepo`) с тремя приложениями и тремя общими пакетами.

```
                        ┌─────────────────────────────────┐
                        │         Браузер пользователя    │
                        └──────┬──────────────┬───────────┘
                               │              │
                    ┌──────────▼───┐    ┌─────▼──────────┐
                    │  LKS :3000   │    │   LKP :3001     │
                    │  (студент)   │    │  (персонал)     │
                    │  React + Vite│    │  React + Vite   │
                    └──────┬───────┘    └─────┬───────────┘
                           │                  │
                           │    HTTP/REST      │
                           └────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │     API :4000        │
                         │     NestJS           │
                         │  JWT + RolesGuard    │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
        ┌────────▼──────┐  ┌────────▼──────┐  ┌───────▼────────┐
        │  PostgreSQL   │  │ sso.mirea.ru  │  │schedule-of     │
        │  (основная БД)│  │ (Keycloak SSO)│  │.mirea.ru       │
        └───────────────┘  └───────────────┘  │(расписание)    │
                                               └────────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │   lk.mirea.ru     │
                         │  (Bitrix CMS,     │
                         │  HTML-парсинг)    │
                         └───────────────────┘
```

### Технологический стек

| Уровень | Технология |
|---------|-----------|
| Backend | NestJS 10, TypeORM, PostgreSQL 15 |
| Frontend | React 18, Vite 5, TanStack Query v5, Zustand |
| Стилизация | Tailwind CSS 3 |
| Монорепо | pnpm workspaces, Turborepo |
| Типизация | TypeScript 5, общий пакет `@mirea/types` |
| UI-компоненты | Общая библиотека `@mirea/ui` |
| HTTP-клиент | Axios (с interceptor для JWT и обработкой 401) |
| Авторизация | JWT (passport-jwt) + декоратор `@Roles()` + `RolesGuard` |

### Общие пакеты

**`@mirea/types`** — все TypeScript-интерфейсы, которые используют и фронтенды, и бэкенд:
- `User`, `UserRole` — пользователи и роли
- `Debt`, `MireaDebt`, `DebtStatus` — задолженности
- `RetakeSlot`, `SlotStatus` — слоты пересдач
- `Enrollment`, `EnrollmentStatus`, `EnrollmentError` — записи
- `Result` — результаты
- `TeacherAvailability` — доступность преподавателей
- `RetakeScheduleItem`, `MireaScheduleItem` — расписание

**`@mirea/ui`** — переиспользуемые React-компоненты:
- `AppShell` — обёртка с боковой навигацией, хлебные крошки, шапка
- `Button`, `Badge`, `EmptyState`, `Modal` — базовые компоненты
- `SlotCard`, `Table` — специфичные компоненты системы

**`@mirea/config`** — общие конфиги: `tsconfig.base.json`, `tailwind.base.ts`

---

## База данных и сущности

### Схема сущностей

```
User ──< Debt              (студент → его задолженности)
User ──< TeacherAvailability (преподаватель → его окна доступности)
User ──< Enrollment.studentId
RetakeSlot ──< Enrollment  (слот → записи студентов)
Enrollment ──< Result      (запись → результат, 1:1)
AuditLog.userId → User
```

### User

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID (PK) | |
| `fullName` | string | ФИО |
| `email` | string (unique) | |
| `passwordHash` | string | Только для локальных аккаунтов |
| `role` | enum | `student \| teacher \| dept_worker \| dept_head \| academic_office \| admin` |
| `mireaSsoId` | string (nullable, unique) | ID из Keycloak. Ставится при SSO-входе |
| `mireaTeacherId` | string (nullable) | ID преподавателя в расписании МИРЭА. Нужен для поиска занятости и дисциплин |
| `mireaGroupId` | string (nullable) | ID учебной группы студента |
| `groupName` | string (nullable) | Название группы |
| `departmentId` | string (nullable) | ID кафедры |
| `createdAt` | timestamptz | |
| `deletedAt` | timestamptz (nullable) | Soft delete |

**Автолинковка преподавателя:** когда преподаватель впервые сохраняет свою доступность, система пытается найти его в базе расписания МИРЭА по фамилии. Если находит — сохраняет `mireaTeacherId`. Это нужно для последующей проверки конфликтов при создании слотов.

### RetakeSlot

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID (PK) | |
| `disciplineId` | string | ID дисциплины в расписании МИРЭА |
| `disciplineName` | string | Название дисциплины |
| `teacherId` | string (nullable) | ID основного преподавателя |
| `teacherName` | string | ФИО основного преподавателя |
| `teachers` | JSON array | Массив `{id, name}` — все преподаватели слота |
| `datetime` | timestamptz | Начало пересдачи |
| `endsAt` | timestamptz | Конец пересдачи (по умолчанию datetime + 2 часа) |
| `room` | string (nullable) | Название аудитории |
| `roomId` | string (nullable) | ID аудитории в расписании МИРЭА |
| `maxStudents` | int | Лимит студентов (по умолчанию 20) |
| `enrolledCount` | int | Текущее количество записанных |
| `status` | enum | `draft → approved → published → closed` |
| `approvedBy` | UUID (nullable) | ID пользователя, утвердившего слот |
| `rejectionComment` | string (nullable) | Комментарий при отклонении |
| `createdAt` | timestamptz | |

### TeacherAvailability

Преподаватель указывает временные окна, в которые он готов принимать пересдачи. Это **начальная точка всего процесса** — работник кафедры ориентируется именно на эти данные, когда создаёт слот.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID (PK) | |
| `teacherId` | UUID (nullable) | FK → User |
| `mireaTeacherId` | string (nullable) | ID в расписании МИРЭА |
| `teacherName` | string | ФИО преподавателя |
| `startsAt` | timestamptz | Начало доступного окна |
| `endsAt` | timestamptz | Конец доступного окна |

### Enrollment

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID (PK) | |
| `studentId` | UUID (FK → User) | |
| `slotId` | UUID (FK → RetakeSlot) | |
| `source` | enum | `self` (сам записался) / `manual` (записал учебный отдел) |
| `status` | enum | `enrolled → completed / absent` |
| `createdAt` | timestamptz | |

### Result

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID (PK) | |
| `enrollmentId` | UUID (FK → Enrollment, 1:1) | |
| `grade` | int (nullable) | Оценка 2–5 |
| `passed` | boolean | Сдал/не сдал |
| `notes` | string (nullable) | Комментарий преподавателя |
| `recordedBy` | UUID | ID преподавателя, внёсшего результат |
| `recordedAt` | timestamptz | |

### Debt

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID (PK) | |
| `studentId` | UUID (FK → User) | |
| `disciplineId` | string | |
| `disciplineName` | string | |
| `debtType` | string | `Экзамен`, `Зачёт`, `Зачёт дифференцированный` |
| `semester` | string | Например: `1з`, `2з` |
| `groupNumber` | string | |
| `status` | enum | `active → closed / unresolved` |
| `date` | string (ISO date) | Дата задолженности |

### AuditLog

Каждое значимое действие (запись, внесение результата, публикация слота и т.д.) фиксируется в `audit_log`.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID (PK) | |
| `userId` | UUID | Кто совершил действие |
| `action` | string | `ENROLL`, `RECORD_RESULT`, `PUBLISH_SLOT`, ... |
| `entity` | string | `enrollment`, `result`, `slot`, ... |
| `entityId` | UUID (nullable) | ID затронутой записи |
| `payload` | JSONB (nullable) | Детали действия |
| `createdAt` | timestamptz | |

---

## Аутентификация и SSO

### Архитектура аутентификации

```
┌──────────────────────────────────────────────────────────┐
│                    Варианты входа                         │
├──────────────────────┬───────────────────────────────────┤
│   Локальный вход     │       МИРЭА SSO                   │
│  (email + пароль)    │  (username + пароль Keycloak)     │
│  bcrypt проверка     │  OpenID Connect PKCE              │
│  Для тестовых акк.   │  Для студентов и персонала        │
└──────────────────────┴───────────────────────────────────┘
                           │
                    JWT выпускается
                 {sub: userId, email, role}
                           │
              ┌────────────▼────────────┐
              │   Authorization: Bearer │
              │   во всех запросах      │
              └────────────────────────-┘
```

### Как работает МИРЭА SSO (OpenID Connect PKCE)

МИРЭА использует Keycloak (`sso.mirea.ru`). Протокол — OpenID Connect с **PKCE** (Proof Key for Code Exchange): авторизация без client_secret, код обменивается только если знаешь исходный `code_verifier`.

#### Полный flow шаг за шагом:

```
Клиент (браузер)        Наш API            sso.mirea.ru         pulse.mirea.ru
      │                    │                     │                    │
      │─ POST /auth/mirea ─>│                     │                    │
      │  {username, pass}  │                     │                    │
      │                    │ Генерирует PKCE:     │                    │
      │                    │ code_verifier (64b)  │                    │
      │                    │ code_challenge =     │                    │
      │                    │   SHA256(verifier)   │                    │
      │                    │─ GET /openid-connect ─>│                   │
      │                    │   /auth?client_id=   │                    │
      │                    │   attendance-app     │                    │
      │                    │   &code_challenge=.. │                    │
      │                    │                     │                    │
      │                    │<─ 302 /login ────────│                    │
      │                    │── POST /login ────────>│                   │
      │                    │  {username, password}│                    │
      │                    │                     │                    │
      │                    │<─ [если 2FA нужна] ──│                    │
      │<─ {otpRequired}─────│                     │                    │
      │─ POST /auth/otp ───>│                     │                    │
      │  {challengeId, code}│                     │                    │
      │                    │── POST /login ─────────>│                  │
      │                    │  {username, pw, otp} │                    │
      │                    │<─ 302 ?code=AUTH_CODE│                    │
      │                    │                     │                    │
      │                    │── POST /token ─────────>│                  │
      │                    │  code + code_verifier│                    │
      │                    │<─ {access_token,...} │                    │
      │                    │                     │                    │
      │                    │─── gRPC GetMeInfo ──────────────────────>│
      │                    │<── {fullName, id,...} ───────────────────│
      │                    │                     │                    │
      │                    │ Upsert User в БД     │                    │
      │                    │ Сохранить cookies    │                    │
      │                    │ в MireaTokenStore    │                    │
      │<─ {accessToken,     │                     │                    │
      │    role, fullName} ─│                     │                    │
```

#### Технические детали реализации

**1. PKCE (`MireaSsoService`):**
```
code_verifier  = crypto.randomBytes(64).toString('base64url')
code_challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
```
Keycloak сверяет challenge при авторизации и verifier при обмене кода.

**2. Хранение challenge (`MireaChallengeStore`):**
Промежуточное состояние OTP-вызова (`challengeId → {verifier, username, password}`) хранится in-memory с TTL 10 минут. После обмена кодом — автоматически удаляется.

**3. Получение профиля через Pulse gRPC:**
После получения `access_token` API делает gRPC-запрос `GetMeInfo` на `attendance.mirea.ru:443`. Pulse возвращает ФИО, ID преподавателя/студента, группу и другие данные, которые сохраняются в `User`.

**4. Upsert пользователя:**
- Поиск по `mireaSsoId`
- Если не найден — создаётся новый `User` с ролью `student` (по умолчанию)
- Если найден — обновляется `fullName` и данные из Pulse
- Роль никогда не перезаписывается автоматически (только через `/admin/users`)

**5. MireaTokenStore (in-memory):**
После успешного SSO-входа cookies и access_token Keycloak сохраняются в памяти:
```
userId → { cookieHeader, lkCookieHeader, accessToken, refreshToken }
```
Используются для последующего доступа к `lk.mirea.ru` от имени пользователя.

**6. Bootstrap сессии lk.mirea.ru (`bootstrapLkSession`):**
Параллельно с SSO-входом система устанавливает Bitrix-сессию на `lk.mirea.ru`. Подробнее — в разделе [Интеграция с МИРЭА ЛК](#интеграция-с-мирэа-лк).

#### Локальный вход

```
POST /api/auth/login
{ "email": "admin@mirea.ru", "password": "secret" }
```

Используется bcrypt для проверки пароля. Выдаёт тот же JWT. Предназначен для тестовых и служебных аккаунтов.

#### JWT-токен

```json
{
  "sub": "user-uuid",
  "email": "user@mirea.ru",
  "role": "teacher",
  "iat": 1746200000,
  "exp": 1746286400
}
```

Токен передаётся в заголовке `Authorization: Bearer <token>` всех защищённых запросов. Axios-interceptor во фронтендах автоматически добавляет заголовок и при получении 401 выполняет logout.

---

## Роли пользователей

| Роль | Кто | Портал | Основные права |
|------|-----|--------|----------------|
| `student` | Студент | LKS | Смотреть задолженности, записываться на пересдачи, видеть свои результаты |
| `teacher` | Преподаватель | LKP | Указывать доступность, видеть свои слоты, вносить оценки |
| `dept_worker` | Работник кафедры | LKP | Создавать/редактировать/удалять черновики слотов |
| `dept_head` | Заведующий кафедрой | LKP | Все права dept_worker + просматривать и утверждать черновики |
| `academic_office` | Учебный отдел | LKP | Утверждать и публиковать слоты, записывать студентов вручную, смотреть аудит |
| `admin` | Администратор | LKP | Полный доступ: управление пользователями, все права academic_office |

---

## Полный процесс организации пересдачи

Процесс состоит из **6 этапов**. Отправная точка — преподаватель, который указывает своё свободное время. Дальше эстафета переходит к сотрудникам кафедры и учебному отделу, и только в конце — к студенту.

```
Преподаватель    Работник кафедры    Зав. кафедрой    Учебный отдел    Студент
      │                  │                  │                │              │
  [1] │                  │                  │                │              │
   Указывает ─────────>  │                  │                │              │
   доступность           │                  │                │              │
      │               [2]│                  │                │              │
      │               Создаёт ─────────────>│                │              │
      │               черновик  [draft]     │                │              │
      │                  │               [3]│                │              │
      │                  │            Утверждает ──────────> │              │
      │                  │            [approved]             │              │
      │                  │                  │             [4]│              │
      │                  │                  │          Публикует ──────────>│
      │                  │                  │          [published]          │
      │                  │                  │                │           [5]│
      │                  │                  │                │         Записывается
      │                  │                  │                │         [enrollment]
      │    [6]           │                  │                │              │
   Проводит ─────────────────────────────────────────────────────────────> │
   пересдачу             │                  │                │         [result]
   Вносит оценки         │                  │                │         debt→closed
```

---

### Этап 1. Преподаватель указывает доступность

**Это начало всего процесса.** Прежде чем работник кафедры может создать слот, он должен знать, когда преподаватель свободен.

**Портал:** LKP → раздел «Мои окна доступности» (`/availability`)

**Что делает преподаватель:**
- Добавляет временные интервалы: дата/время начала и дата/время конца
- Может добавить несколько окон (например, каждый понедельник с 14:00 до 17:00)
- Может удалить устаревшие интервалы

**Что происходит в системе:**
- Сохраняется `TeacherAvailability` в БД
- При первом сохранении система пытается автоматически найти преподавателя в базе расписания МИРЭА по фамилии и записать `mireaTeacherId` в `User`
- `mireaTeacherId` нужен для получения расписания занятий (через iCal-фид) при проверке конфликтов

**API:**
```
POST /api/retake-schedule/availability/my   — сохранить окна
GET  /api/retake-schedule/availability/my   — получить свои окна
Role: teacher
```

---

### Этап 2. Работник кафедры создаёт черновик слота

**Портал:** LKP → раздел кафедры → «Создать слот» (`/schedule/draft`)

**Что видит и делает работник кафедры:**
- Выбирает дисциплину из базы расписания МИРЭА (или из fallback-списка)
- Ищет преподавателей, связанных с выбранной дисциплиной
- **Видит окна доступности каждого преподавателя** (данные из этапа 1)
- Выбирает одного или нескольких преподавателей
- Указывает дату, время начала и конца (по умолчанию +2 часа)
- Выбирает аудиторию из расписания МИРЭА
- Указывает максимальное количество студентов

**Что происходит в `RetakeScheduleService.create()`:**
1. Парсится `datetime` и `endsAt`
2. Для каждого преподавателя и аудитории выполняется **проверка конфликтов** (`MireaScheduleService.hasBusyConflict`):
   - Скачивается iCal-фид расписания МИРЭА для преподавателя/аудитории
   - Парсируются `VEVENT` — занятия, которые пересекаются с выбранным временем
   - Если конфликт найден → `400 Bad Request` с описанием
3. Проверяется, не занята ли аудитория другой пересдачей в это время
4. Создаётся `RetakeSlot` со статусом `draft`

**API:**
```
POST   /api/retake-schedule            — создать черновик
PATCH  /api/retake-schedule/:id        — отредактировать черновик
DELETE /api/retake-schedule/:id        — удалить черновик
GET    /api/retake-schedule/draft      — список черновиков
Role: dept_worker, dept_head
```

---

### Этап 3. Заведующий кафедрой рассматривает черновик

**Портал:** LKP → раздел «На рассмотрении» (`/schedule/review`)

**Что делает зав. кафедрой:**
- Просматривает черновики, созданные работниками кафедры
- **Утверждает** слот → статус `approved`, слот переходит в учебный отдел
- **Отклоняет** с комментарием → статус `draft` (не удаляется), работник кафедры видит комментарий и может внести исправления

**API:**
```
PATCH /api/retake-schedule/:id/approve   — утвердить
PATCH /api/retake-schedule/:id/reject    — отклонить (body: {comment})
GET   /api/retake-schedule/draft         — черновики для рассмотрения
Role: dept_head (также имеет все права dept_worker)
```

---

### Этап 4. Учебный отдел публикует слот

**Портал:** LKP → раздел «Утверждённые» (`/schedule/publish`)

**Что делает учебный отдел:**
- Просматривает утверждённые (статус `approved`) слоты
- **Публикует** → статус `published`
- После публикации слот становится виден студентам в LKS

**Дополнительно — ручная запись студентов (`/admissions`):**
- Поиск студента по имени или email
- Просмотр его активных задолженностей
- Запись студента на нужный слот без ограничения «12 часов»

**API:**
```
PATCH /api/retake-schedule/:id/publish   — опубликовать
GET   /api/retake-schedule/approved      — утверждённые слоты
POST  /api/enrollments/manual            — записать студента вручную
Role: academic_office, admin
```

---

### Этап 5. Студент записывается на пересдачу

**Портал:** LKS → «Академические задолженности» (`/learning/debt`)

**Что видит студент:**
- **Таблица 1: Задолженности из нашей БД** — синхронизированные задолженности с кнопкой «Записаться» (если для дисциплины есть опубликованные слоты)
- **Таблица 2: Задолженности из МИРЭА ЛК** — данные, загруженные с `lk.mirea.ru` (подробнее — в разделе про интеграцию)
- **Уведомления** — информация о дедлайнах по задолженностям

**Как происходит запись:**
1. Студент нажимает «Записаться» у нужной задолженности
2. Открывается модальное окно со списком доступных слотов для этой дисциплины
3. Студент выбирает удобный слот (видит дату, аудиторию, преподавателя, сколько мест осталось)
4. Подтверждает запись

**Проверки в `EnrollmentsService.enroll()` (BR-01):**
- Задолженность студента существует и имеет статус `active`
- Слот опубликован (`published`)
- Студент ещё не записан на этот слот (`ALREADY_ENROLLED`)
- Не превышен `maxStudents` (`SLOT_FULL`)
- До начала пересдачи осталось **≥ 12 часов** (`TOO_LATE`) — только для самозаписи, ручная запись это ограничение обходит

**API:**
```
GET  /api/retake-schedule/published?disciplineId=<uuid>  — доступные слоты
POST /api/enrollments   { slotId }                        — записаться
GET  /api/enrollments/my                                  — мои записи
Role: student
```

**Коды ошибок (`EnrollmentError.reason`):**
- `NO_DEBT` — задолженность не найдена или уже закрыта
- `ALREADY_ENROLLED` — студент уже записан на этот слот
- `SLOT_FULL` — мест нет
- `TOO_LATE` — менее 12 часов до начала
- `NO_RIGHT` — нет прав (не студент)

---

### Этап 6. Преподаватель проводит пересдачу и вносит результаты

**Портал:** LKP → «Мои пересдачи» (`/retakes`) → «Провести» (`/retakes/:slotId/conduct`)

**Что делает преподаватель:**
- Видит список студентов, записавшихся на его слот
- Для каждого студента указывает:
  - Оценку (2–5)
  - Признак «Сдал» (passed: true/false)
  - Или отмечает «Не явился» (absent)
- Сохраняет результаты

**Что происходит в `ResultsService.record()` (BR-03):**
- Создаётся запись `Result` с оценкой и признаком сдачи
- Статус `Enrollment` меняется на `completed` (или `absent`)
- **Автоматически обновляется задолженность:**
  - `passed: true` → `Debt.status = 'closed'`
  - `passed: false` → `Debt.status = 'unresolved'`
- Действие фиксируется в `AuditLog`

**API:**
```
POST /api/results   { enrollmentId, grade, passed, notes }
GET  /api/results/slot/:slotId
Role: teacher (POST), teacher/staff/admin (GET)
```

---

## Портал преподавателей и сотрудников (LKP)

LKP — единый портал для всего персонала МИРЭА. Интерфейс адаптируется под роль пользователя: преподаватель видит только свои разделы, работник кафедры — свои и т.д.

### Вход (`/login`)

- SSO-вход через МИРЭА (имя пользователя + пароль, поддержка 2FA)
- Локальный вход (email + пароль) для служебных аккаунтов
- После входа роль из JWT определяет доступные разделы навигации

### Разделы по ролям

#### Преподаватель (`teacher`)

**«Мои окна доступности»** (`/availability`):
- Список временных интервалов преподавателя
- Форма добавления нового интервала: начало и конец
- Кнопка удаления интервала
- Данные автоматически используются при создании слотов кафедрой

**«Мои пересдачи»** (`/retakes`):
- Таблица опубликованных слотов, в которых преподаватель указан
- Для каждого слота: дата, дисциплина, аудитория, кол-во записавшихся / лимит
- Кнопка «Провести» — активна для слотов, до которых осталось мало времени или которые уже начались

**«Провести пересдачу»** (`/retakes/:slotId/conduct`):
- Список студентов, записавшихся на слот
- Для каждого: поле оценки (2–5) + чекбокс «Сдал» + отметка «Не явился»
- Кнопка «Сохранить все результаты»

#### Работник кафедры (`dept_worker`)

**«Расписание пересдач»** (`/schedule/draft`):
- Таблица черновиков, созданных работниками кафедры
- Кнопка «Создать слот»
- Форма создания: выбор дисциплины, выбор преподавателя (видны его окна доступности), выбор аудитории, дата и время, лимит студентов
- Кнопки редактирования и удаления для своих черновиков

#### Заведующий кафедрой (`dept_head`)

Имеет все разделы `dept_worker`, плюс:

**«На рассмотрении»** (`/schedule/review`):
- Таблица черновиков всех работников кафедры
- Кнопки «Утвердить» и «Отклонить»
- При отклонении — поле для комментария, который увидит работник кафедры

#### Учебный отдел (`academic_office`)

**«Утверждённые слоты»** (`/schedule/publish`):
- Таблица слотов со статусом `approved`
- Кнопка «Опубликовать» для каждого слота

**«Зачисление студентов»** (`/admissions`):
- Поиск студента по имени или email
- Список активных задолженностей найденного студента
- Выбор опубликованного слота
- Ручная запись (без проверки 12-часового правила)

#### Администратор (`admin`)

**«Пользователи»** (`/admin/users`):
- Поиск и список всех пользователей системы
- Форма создания нового пользователя
- Изменение роли, ФИО, `mireaTeacherId`

**«Журнал аудита»** (`/admin/audit`):
- До 200 последних записей
- Фильтрация по дате и типу действия
- Кто, что, когда сделал

---

## Личный кабинет студента (LKS)

### Вход (`/login`)

- SSO-вход через МИРЭА — основной способ для студентов
- Поддержка 2FA (код из приложения Keycloak)
- Локальный вход — для тестирования
- После входа автоматический редирект на `/learning/debt`

### Академические задолженности (`/learning/debt`)

Главная страница студента. Содержит три блока:

**1. Задолженности из нашей БД:**
- Таблица с дисциплиной, типом контроля, семестром, группой и датой
- У каждой задолженности — кнопка «Записаться» (если есть опубликованные слоты) или «Нет доступных слотов»
- При нажатии открывается `SlotModal` — список слотов с деталями

**2. Задолженности из МИРЭА ЛК:**
- Данные с `lk.mirea.ru/learning/debt/` (HTML-парсинг)
- Показывается только если у пользователя есть SSO-сессия
- Отображает дисциплину, дату и кнопку «Записаться»
- При ошибке подключения — жёлтый информер с объяснением
- При отсутствии данных — `EmptyState`

**3. Уведомления:**
- Список уведомлений о задолженностях с датой

### Мои пересдачи (`/learning/retakes`)

- Таблица всех записей студента на пересдачи
- Для каждой: дисциплина, дата, статус (`enrolled` / `completed` / `absent`)

---

## API — справочник эндпоинтов

Базовый URL: `http://localhost:4000/api`

Все эндпоинты (кроме `/auth/login` и `/auth/mirea/*`) требуют:
```
Authorization: Bearer <jwt_token>
```

### Аутентификация

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| POST | `/auth/login` | — | Вход по email/паролю |
| POST | `/auth/mirea/login` | — | Начало SSO-входа через МИРЭА |
| POST | `/auth/mirea/otp` | — | Подтверждение 2FA-кода |
| GET | `/auth/mirea/session` | любая | Статус МИРЭА SSO-сессии |

### Задолженности

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/debts/my` | student | Мои задолженности из внутренней БД |
| GET | `/debts/mirea` | student | Задолженности с lk.mirea.ru |
| GET | `/debts?studentId=` | academic_office, admin | Задолженности конкретного студента |

### Расписание пересдач

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| POST | `/retake-schedule` | dept_worker, dept_head | Создать черновик слота |
| PATCH | `/retake-schedule/:id` | dept_worker, dept_head | Редактировать черновик |
| DELETE | `/retake-schedule/:id` | dept_worker, dept_head | Удалить черновик |
| PATCH | `/retake-schedule/:id/approve` | dept_head, academic_office, admin | Утвердить |
| PATCH | `/retake-schedule/:id/reject` | dept_head, academic_office, admin | Отклонить с комментарием |
| PATCH | `/retake-schedule/:id/publish` | academic_office, admin | Опубликовать |
| GET | `/retake-schedule/draft` | dept_worker, dept_head, academic_office, admin | Черновики |
| GET | `/retake-schedule/approved` | academic_office, admin | Утверждённые |
| GET | `/retake-schedule/published` | все | Опубликованные (`?disciplineId=` опционально) |
| GET | `/retake-schedule/my` | teacher | Слоты текущего преподавателя |
| POST | `/retake-schedule/availability/my` | teacher | Сохранить окна доступности |
| GET | `/retake-schedule/availability/my` | teacher | Мои окна доступности |
| GET | `/retake-schedule/availability` | academic_office, admin | Доступность всех преподавателей |
| GET | `/retake-schedule/availability/teacher/:mireaId` | academic_office, admin | Доступность конкретного преподавателя |

### Записи на пересдачи

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| POST | `/enrollments` | student | Записаться на пересдачу |
| GET | `/enrollments/my` | student | Мои записи |
| GET | `/enrollments/slot/:slotId` | teacher, academic_office, admin | Список записавшихся на слот |
| POST | `/enrollments/manual` | academic_office, admin | Записать студента вручную |

### Результаты

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| POST | `/results` | teacher | Внести результат студента |
| GET | `/results/slot/:slotId` | teacher, academic_office, admin | Результаты по слоту |

### Расписание МИРЭА

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/mirea-schedule/search` | все | Поиск групп, преподавателей, аудиторий |
| GET | `/mirea-schedule/disciplines` | все | Список дисциплин |
| GET | `/mirea-schedule/disciplines/:id/teachers` | все | Преподаватели дисциплины |
| POST | `/mirea-schedule/sync` | admin | Запустить синхронизацию |
| GET | `/mirea-schedule/sync-state` | admin | Статус последней синхронизации |

### Администрирование

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/admin/users` | admin, academic_office | Список/поиск пользователей |
| POST | `/admin/users` | admin | Создать пользователя |
| PATCH | `/admin/users/:id` | admin | Изменить роль/ФИО/mireaTeacherId |
| GET | `/admin/audit` | admin | Журнал аудита |

---

## Интеграция с МИРЭА ЛК

### Зачем это нужно

`lk.mirea.ru` — официальный личный кабинет МИРЭА на базе Bitrix CMS. В нём хранятся «официальные» академические задолженности. Поскольку публичного API нет, система эмулирует браузерную сессию на стороне сервера.

### Полный маршрут запроса (`MireaLkService.fetchWithRedirects`)

```
Шаг 1: GET lk.mirea.ru/learning/debt/
        → 302 /auth.php  (нет сессии Bitrix)

Шаг 2: GET lk.mirea.ru/auth.php
        → 200 [страница входа]
        Определяем по: id="login-form" | name="USER_LOGIN"
        → Автоматически переходим на /auth/sso.php

Шаг 3: GET lk.mirea.ru/auth/sso.php
        → 302 sso.mirea.ru/realms/mirea/openid-connect/auth
                    ?client_id=lk-mirea&...

Шаг 4: GET sso.mirea.ru/... (Keycloak)
        Отправляем cookies нашей SSO-сессии
        → Keycloak видит активную сессию
        → 302 lk.mirea.ru/auth/sso.php?code=AUTH_CODE&session_state=...

Шаг 5: GET lk.mirea.ru/auth/sso.php?code=...
        lk.mirea.ru обменивает code на Bitrix-сессию
        → 302 lk.mirea.ru/

Шаг 6: GET lk.mirea.ru/
        Страница может содержать форму выбора студенческого профиля:
        <input name="selectStudentProfile" value="<uuid>">
        POST selectStudentProfile=<uuid>
        → 302 lk.mirea.ru/ (профиль выбран, сессия установлена)

Шаг 7: GET lk.mirea.ru/learning/debt/
        → 200 HTML со списком задолженностей ✓
```

**Важно:** форма `selectStudentProfile` появляется на **каждой** странице lk.mirea.ru (в боковой навигации Bitrix). Поэтому POSTим её только когда `url !== startUrl` — чтобы не попасть в бесконечный цикл.

**Обработка редиректов:** сервер идёт по редиректам вручную (`redirect: 'manual'`), собирая cookies через `SimpleCookieJar`. Все `Set-Cookie` заголовки каждого ответа мерджатся в jar и отправляются в следующем запросе.

### Парсинг HTML-таблицы задолженностей

```
extractTables() → ищет все <table> в HTML
  для каждой таблицы:
    extractCellsFromTag('th') — заголовки колонок
    extractHeadersFromThead() — заголовки из <thead>

mapColumns() — сопоставляет заголовки с полями:
  /дисципл/i  → disciplineName
  /дат/i      → date
  /тип|контрол|форм/i → controlType
  /семестр/i  → semester
  /преподав|фио|учитель/i → teacher

Если таблица с дисциплиной не найдена → fallbackParse()
  ищет элементы с class="*debt*"
```

### Обработка ошибок сессии

- Если `cookieHeader` пустой → `GET /debts/mirea` возвращает `[]` (не ошибку)
- Если SSO-сессия устарела → `503 Service Unavailable` (не `401`)
- `401` специально не используется — он вызвал бы Axios interceptor и автоматический logout из нашей системы

---

## Интеграция с расписанием МИРЭА

### Зачем это нужно

При создании слота пересдачи система проверяет, не занят ли преподаватель или аудитория в выбранное время по основному расписанию занятий.

### Как работает синхронизация

**`MireaScheduleService`** раз в 24 часа (настраивается через `MIREA_SCHEDULE_SYNC_INTERVAL_HOURS`) выполняет:
1. Поиск по ~150 терминам через API `schedule-of.mirea.ru`
2. Сохранение результатов в локальную БД: преподаватели, аудитории, группы
3. Для каждого преподавателя — скачивание и парсинг iCal-фида
4. Построение таблицы «дисциплина → преподаватели»

Хранится: `MireaScheduleItem { id, type, mireaId, title, fullTitle, iCalLink, updatedAt }`

### Проверка конфликтов (`hasBusyConflict`)

При создании слота для каждого преподавателя и аудитории:
1. Скачивается iCal-фид с расписанием
2. Парсируются `VEVENT` — все занятия
3. Проверяется пересечение `[datetime, endsAt]` с каждым `VEVENT [DTSTART, DTEND]`
4. Если пересечение найдено → `400 Bad Request` с названием конфликтующего занятия

Дополнительно: проверяется, не назначена ли другая пересдача в эту же аудиторию в то же время.

### Поиск при создании слота

**Дисциплины:** поиск по базе синхронизированных дисциплин + fallback-список
**Преподаватели:** по `disciplineId` через таблицу связей
**Аудитории:** поиск по названию через `schedule-of.mirea.ru/search`

---

## Структура проекта

```
mirea/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── auth/
│   │       │   ├── auth.controller.ts      — /auth/login, /auth/mirea/*
│   │       │   ├── auth.service.ts         — бизнес-логика входа
│   │       │   ├── mirea-sso.service.ts    — PKCE flow, bootstrap LK-сессии
│   │       │   ├── jwt.strategy.ts         — passport-jwt стратегия
│   │       │   ├── roles.guard.ts          — проверка роли из декоратора
│   │       │   ├── mirea-token.store.ts    — in-memory хранилище SSO-токенов
│   │       │   └── auth.module.ts
│   │       ├── users/
│   │       │   ├── user.entity.ts          — TypeORM entity
│   │       │   ├── users.service.ts        — upsert по SSO-ID, поиск
│   │       │   └── users.module.ts
│   │       ├── debts/
│   │       │   ├── debt.entity.ts          — TypeORM entity
│   │       │   ├── debts.controller.ts     — /debts/*
│   │       │   ├── debts.service.ts        — CRUD задолженностей
│   │       │   ├── mirea-lk.service.ts     — HTML-парсинг lk.mirea.ru
│   │       │   └── debts.module.ts
│   │       ├── retake-schedule/
│   │       │   ├── retake-slot.entity.ts
│   │       │   ├── teacher-availability.entity.ts
│   │       │   ├── retake-schedule.controller.ts — /retake-schedule/*
│   │       │   ├── retake-schedule.service.ts    — create/approve/publish, conflict check
│   │       │   └── retake-schedule.module.ts
│   │       ├── enrollments/
│   │       │   ├── enrollment.entity.ts
│   │       │   ├── enrollments.controller.ts — /enrollments/*
│   │       │   ├── enrollments.service.ts    — BR-01: 12-часовое правило
│   │       │   └── enrollments.module.ts
│   │       ├── results/
│   │       │   ├── result.entity.ts
│   │       │   ├── results.controller.ts   — /results/*
│   │       │   ├── results.service.ts      — BR-03: закрытие задолженности
│   │       │   └── results.module.ts
│   │       ├── mirea-schedule/
│   │       │   ├── mirea-schedule.entity.ts
│   │       │   ├── mirea-schedule.controller.ts — /mirea-schedule/*
│   │       │   ├── mirea-schedule.service.ts    — sync, search, hasBusyConflict
│   │       │   └── mirea-schedule.module.ts
│   │       ├── pulse/
│   │       │   └── pulse.service.ts        — gRPC GetMeInfo → ФИО пользователя
│   │       ├── admin/
│   │       │   └── admin.controller.ts     — /admin/users, /admin/audit
│   │       ├── audit/
│   │       │   ├── audit-log.entity.ts
│   │       │   └── audit.service.ts
│   │       └── app.module.ts               — root module, все импорты
│   │
│   ├── lks/                                — Личный кабинет студента
│   │   └── src/
│   │       ├── api/
│   │       │   ├── client.ts               — axios instance + 401 interceptor
│   │       │   ├── debts.ts                — getMyDebts, getMireaDebts, enroll
│   │       │   └── enrollments.ts          — getMyEnrollments
│   │       ├── components/
│   │       │   └── SlotModal.tsx           — модальное окно выбора слота
│   │       ├── pages/
│   │       │   ├── LoginPage.tsx           — вход (SSO + локальный)
│   │       │   ├── DebtPage.tsx            — задолженности + запись
│   │       │   └── MyRetakesPage.tsx       — мои пересдачи
│   │       ├── store/
│   │       │   └── auth.ts                 — Zustand: token, role, fullName
│   │       └── router.tsx                  — React Router, защита по роли
│   │
│   └── lkp/                                — Портал преподавателей/сотрудников
│       └── src/
│           ├── api/
│           │   ├── client.ts
│           │   ├── schedule.ts             — CRUD слотов, availability
│           │   ├── enrollments.ts
│           │   └── results.ts
│           ├── pages/
│           │   ├── LoginPage.tsx
│           │   ├── teacher/
│           │   │   ├── AvailabilityPage.tsx  — окна доступности
│           │   │   ├── RetakesPage.tsx       — мои слоты
│           │   │   └── ConductPage.tsx       — проведение, ввод оценок
│           │   ├── dept/
│           │   │   ├── DraftSchedulePage.tsx — создание черновиков
│           │   │   └── ReviewPage.tsx        — рассмотрение (dept_head)
│           │   ├── office/
│           │   │   ├── PublishPage.tsx       — публикация
│           │   │   └── AdmissionsPage.tsx    — ручная запись студентов
│           │   └── admin/
│           │       ├── UsersPage.tsx
│           │       └── AuditPage.tsx
│           ├── store/
│           │   └── auth.ts
│           └── router.tsx
│
└── packages/
    ├── types/src/
    │   ├── user.ts          — User, UserRole
    │   ├── debt.ts          — Debt, MireaDebt, DebtStatus
    │   ├── slot.ts          — RetakeSlot, SlotStatus
    │   ├── enrollment.ts    — Enrollment, EnrollmentStatus, EnrollmentError
    │   ├── result.ts        — Result
    │   ├── availability.ts  — TeacherAvailability
    │   └── index.ts         — barrel export
    ├── ui/src/
    │   ├── AppShell.tsx
    │   ├── Button.tsx
    │   ├── Badge.tsx
    │   ├── Modal.tsx
    │   ├── EmptyState.tsx
    │   └── index.ts
    └── config/
        ├── tsconfig.base.json
        └── tailwind.base.ts
```

---

## Запуск и разработка

### Требования

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+

### Установка зависимостей

```bash
pnpm install
```

### Переменные окружения (`apps/api/.env`)

```env
# База данных
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=mirea
DATABASE_PASSWORD=mirea_pass
DATABASE_NAME=mirea_retake

# JWT
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=15m

# МИРЭА SSO
MIREA_SSO_CLIENT_ID=attendance-app
MIREA_SSO_REDIRECT_URI=https://pulse.mirea.ru/

# Синхронизация расписания (часы)
MIREA_SCHEDULE_SYNC_INTERVAL_HOURS=24
```

### Наполнение базы тестовыми данными

```bash
pnpm --filter @mirea/api build
node apps/api/dist/database/seed.js
```

После выполнения в БД появятся следующие учётные записи (вход через вкладку **«Локально»**):

| Email | Пароль | Роль |
|---|---|---|
| `admin@mirea.ru` | `password123` | Администратор |
| `office@mirea.ru` | `password123` | Учебный офис |
| `head@mirea.ru` | `password123` | Зав. кафедрой |
| `dept@mirea.ru` | `password123` | Работник кафедры |
| `koretsky@mirea.ru` | `password123` | Преподаватель (Корецкий В.П.) |
| `morozov.va@mirea.ru` | `password123` | Преподаватель (Морозов В.А.) |
| `teacher@mirea.ru` | `password123` | Преподаватель (демо) |
| `student01@mirea.ru` … `student15@mirea.ru` | `password123` | Студент |

### Запуск в режиме разработки

```bash
pnpm dev
```

Запускает все три приложения параллельно через Turbo:
- **API:** `http://localhost:4000/api`
- **LKS (студенты):** `http://localhost:3000`
- **LKP (сотрудники):** `http://localhost:3001`

### Сборка

```bash
pnpm build
```

### Линтинг

```bash
pnpm lint
```

### CORS

API принимает запросы с `http://localhost:3000` (LKS) и `http://localhost:3001` (LKP). В production — замените на реальные домены.
