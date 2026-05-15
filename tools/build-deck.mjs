// Builds mirea-deck.html from slides-data.mjs templates.
// Executed via run_script (sandbox doesn't have node, but it can dynamic-import).

import { SLIDES } from './slides-data.mjs';

const FOOT_COMMON = { l: 'РТУ МИРЭА · Система пересдач', r: 'Юшков А. Д. · УИБО-05-23 · 2026' };

const bar = (meta, eyebrow) => `
  <div class="bar">
    <div class="brand"><div class="brand-mark">М</div><div class="brand-text">РТУ МИРЭА<small>СИСТЕМА ПЕРЕСДАЧ</small></div></div>
    <div class="spacer"></div>
    <div class="meta"><span>${meta || ''}</span><span class="pg">— / —</span></div>
  </div>`;

const foot = (f) => {
  if (!f) f = FOOT_COMMON;
  return `<div class="foot"><strong>${f.l}</strong><span class="spacer"></span>${f.r || ''}</div>`;
};

function renderCover(s) {
  return `
<section data-screen-label="${s.label}">
  <div class="cover">
    <div class="cv-bar">
      <div class="brand-mark">М</div>
      <h3>РТУ МИРЭА<small>МИНОБРНАУКИ РОССИИ</small></h3>
    </div>
    <div class="pg-corner">КУРСОВОЙ ПРОЕКТ<b>— / —</b></div>

    <div class="cover-body">
      <div class="cover-eyebrow">Управление ИТ-инфраструктурой организации</div>
      <h1 class="cover-title">Система организации академических пересдач</h1>
      <div class="cover-sub">Веб-платформа для автоматизации полного цикла пересдач — от доступности преподавателя до фиксации оценки студента</div>

      <div class="cover-meta">
        <div class="cell"><label>Студент</label><value>Юшков Артём Денисович</value></div>
        <div class="cell"><label>Группа</label><value>УИБО-05-23</value></div>
        <div class="cell"><label>Кафедра</label><value>ИУ РТУ МИРЭА</value></div>
        <div class="cell"><label>Год</label><value>2026</value></div>
      </div>
    </div>
  </div>
</section>`;
}

function renderThanks(s) {
  return `
<section data-screen-label="${s.label}">
  <div class="cover">
    <div class="cv-bar">
      <div class="brand-mark">М</div>
      <h3>РТУ МИРЭА<small>МИНОБРНАУКИ РОССИИ</small></h3>
    </div>
    <div class="pg-corner">КУРСОВОЙ ПРОЕКТ<b>— / —</b></div>

    <div class="cover-body" style="bottom:160px">
      <div class="cover-eyebrow">Готов ответить на вопросы</div>
      <h1 class="cover-title" style="font-size:140px">Спасибо<br>за внимание</h1>
      <div class="cover-sub" style="margin-top:48px">Система организации академических пересдач для РТУ МИРЭА</div>

      <div class="cover-meta" style="margin-top:48px">
        <div class="cell"><label>Автор</label><value>Юшков Артём Денисович</value></div>
        <div class="cell"><label>Группа</label><value>УИБО-05-23</value></div>
        <div class="cell"><label>Кафедра</label><value>ИУ РТУ МИРЭА</value></div>
        <div class="cell"><label>2026</label><value>Курсовой проект</value></div>
      </div>
    </div>
  </div>
</section>`;
}

function renderDivider(s) {
  return `
<section data-screen-label="${s.label}">
  <div class="divider">
    <div class="lbl">${s.sectionLbl}</div>
    <div class="num">${s.section}</div>
    <h2 class="ttl">${s.title}</h2>
    <div class="dot-list">${s.dots.map(d => `<span>${d}</span>`).join('')}</div>
  </div>
</section>`;
}

function renderBpmn(s) {
  const tags = (s.tags || []).map(t => `<span class="tag outline">${t}</span>`).join('');
  return `
<section data-screen-label="${s.label}">
  ${bar(s.meta)}
  <div class="stage" style="padding:48px 96px 28px 96px">
    <div class="eyebrow">${s.eyebrow}</div>
    <h2 class="title sm">${s.title}</h2>
    ${s.lead ? `<p class="bpmn-lead">${s.lead}</p>` : ''}
    ${tags ? `<div class="bpmn-tags">${tags}</div>` : ''}
    <div class="bpmn-block">
      <img src="${s.img}" alt="${s.title}" loading="eager" decoding="sync">
    </div>
  </div>
  ${foot(s.foot)}
</section>`;
}

function renderShot(s) {
  const side = s.side || {};
  const bullets = (side.bullets || []).map(b => `<li>${b}</li>`).join('');
  const browser = `
    <div class="browser">
      <div class="bb"><i></i><i></i><i></i><div class="url">${s.url || ''}</div></div>
      <div class="bd contain"><img src="${s.img}" alt="${side.heading || s.sectionTitle || ''}" loading="eager" decoding="sync"></div>
    </div>`;
  const sideBlock = `
    <div class="shot-side">
      ${side.what ? `<div class="what">${side.what}</div>` : ''}
      ${side.heading ? `<h3>${side.heading}</h3>` : ''}
      ${side.lead ? `<p class="lead">${side.lead}</p>` : ''}
      ${bullets ? `<ul class="bullets">${bullets}</ul>` : ''}
      ${side.stampN ? `<div class="stamp"><div class="step-dot">${side.stampN}</div><div>${side.stampT || ''}</div></div>` : ''}
    </div>`;
  const split = s.rev
    ? `<div class="shot-split rev">${sideBlock}${browser}</div>`
    : `<div class="shot-split">${browser}${sideBlock}</div>`;
  return `
<section data-screen-label="${s.label}">
  ${bar(s.meta)}
  <div class="stage" style="padding-bottom:32px">
    <div class="eyebrow">${s.eyebrow}</div>
    <h2 class="title sm" style="margin-bottom:18px">${s.sectionTitle}</h2>
    <div class="rule" style="margin-bottom:24px"></div>
    ${split}
  </div>
  ${foot(s.foot)}
</section>`;
}

// ============= content body templates =============
const BODY = {
  actuality: () => `
    <div class="grid-2" style="gap:64px">
      <div>
        <p class="lead">Пересдачи в МИРЭА сегодня организуются вручную — бумажные заявления, устные договорённости и фрагментированный обмен информацией.</p>
        <ul class="bullets">
          <li><b>Студент</b> не знает о доступных слотах и не может самостоятельно записаться</li>
          <li><b>Преподаватель</b> не имеет единого инструмента для указания своей доступности</li>
          <li><b>Учебный отдел</b> тратит часы на согласование между всеми участниками</li>
        </ul>
      </div>
      <div>
        <ul class="bullets">
          <li>Отсутствует <b>автоматическая проверка</b> конфликтов в расписании</li>
          <li>Нет <b>единого журнала аудита</b> — невозможно отследить историю действий</li>
          <li>Бумажные заявления <b>теряются</b>, согласования срываются по человеческому фактору</li>
        </ul>
        <div class="callout" style="margin-top:32px">
          <small>Цель работы</small>
          Автоматизировать полный цикл организации пересдач в РТУ МИРЭА
        </div>
      </div>
    </div>`,

  goals: () => `
    <div class="callout" style="font-size:24px; margin-bottom:36px">
      <small>Цель</small>
      Создать веб-платформу для автоматизации академических пересдач в РТУ МИРЭА
    </div>
    <div class="tile-grid" style="grid-template-columns:repeat(3,1fr); gap:18px">
      ${[
        ['01','Личный кабинет студента','LKS — просмотр долгов, запись на пересдачи, контроль статусов'],
        ['02','Портал персонала','LKP с разграничением прав для 6 ролей по модели RBAC'],
        ['03','REST API на NestJS','С интеграцией МИРЭА SSO — Keycloak, OpenID Connect, PKCE'],
        ['04','Интеграция с инфраструктурой','lk.mirea.ru (HTML-парсинг долгов) и расписанием МИРЭА (iCal)'],
        ['05','Автопроверка конфликтов','Конфликты расписания обнаруживаются при создании слотов'],
        ['06','Полный аудит','Журнал всех действий в системе с привязкой к пользователю'],
      ].map(([n,h,p]) => `
        <div class="tile">
          <div class="ic">${n}</div>
          <h4>${h}</h4>
          <p>${p}</p>
        </div>`).join('')}
    </div>`,

  stack: () => `
    <div class="kvlist">
      ${[
        ['Backend','<code>NestJS 10</code> · <code>TypeORM</code> · <code>PostgreSQL 15</code>'],
        ['Frontend','<code>React 18</code> · <code>Vite 5</code> · <code>Tailwind CSS 3</code>'],
        ['State / Data','<code>TanStack Query v5</code> · <code>Zustand</code>'],
        ['Монорепо','<code>pnpm workspaces</code> + <code>Turborepo</code>'],
        ['Типизация','<code>TypeScript 5</code>, общий пакет <code>@mirea/types</code>'],
        ['UI-компоненты','Общая библиотека <code>@mirea/ui</code>'],
        ['Авторизация','<code>JWT (passport-jwt)</code> + <code>@Roles()</code> + <code>RolesGuard</code>'],
        ['HTTP-клиент','<code>Axios</code> + interceptor — JWT, auto-logout при 401'],
        ['Интеграции','Keycloak SSO · Pulse gRPC · lk.mirea.ru · schedule-of.mirea.ru'],
      ].map(([k,v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}
    </div>`,

  architecture: () => `
    <div class="arch">
      <div class="arch-row">
        <div class="arch-tile">
          <div class="kk">КЛИЕНТ · ПОРТ 3000</div>
          <div class="ll">ЛКС — Студент</div>
          <div class="dd">React 18 + Vite — личный кабинет, запись на пересдачи</div>
        </div>
        <div class="arch-tile">
          <div class="kk">КЛИЕНТ · ПОРТ 3001</div>
          <div class="ll">ЛКП — Персонал</div>
          <div class="dd">React 18 + Vite — портал для 6 ролей RBAC</div>
        </div>
      </div>
      <div class="arch-conn">↓ &nbsp; HTTP / REST &nbsp; ↓</div>
      <div class="arch-row">
        <div class="arch-tile primary" style="flex:2">
          <div class="kk">API · ПОРТ 4000</div>
          <div class="ll">NestJS — REST API</div>
          <div class="dd">JWT (passport-jwt) + RolesGuard + @Roles() · ValidationPipe · CORS</div>
        </div>
      </div>
      <div class="arch-conn">↓ &nbsp; внешние интеграции &nbsp; ↓</div>
      <div class="arch-row">
        ${[
          ['БД','PostgreSQL 15','основная БД, TypeORM'],
          ['SSO','sso.mirea.ru','Keycloak · OpenID PKCE'],
          ['ЛК','lk.mirea.ru','Bitrix-сессия · HTML-парсинг'],
          ['РАСПИСАНИЕ','schedule-of.mirea.ru','REST + iCal · конфликты'],
          ['PULSE','attendance.mirea.ru','gRPC · GetMeInfo'],
        ].map(([k,l,d]) => `
          <div class="arch-tile">
            <div class="kk">${k}</div>
            <div class="ll">${l}</div>
            <div class="dd">${d}</div>
          </div>`).join('')}
      </div>
    </div>`,

  monorepo: () => `
    <div class="grid-2">
      <div>
        <p class="lead" style="font-size:24px">Единый репозиторий: 3 приложения и 3 общих пакета объединены в одно дерево с параллельной сборкой и кэшированием артефактов.</p>
        <div class="callout">
          <small>Один deps-граф · одна команда</small>
          pnpm dev запускает API + LKS + LKP одновременно через Turbo
        </div>
      </div>
      <div>
        <table class="tbl">
          <thead><tr><th>Пакет</th><th>Описание</th></tr></thead>
          <tbody>
            ${[
              ['apps/api','NestJS backend · порт 4000'],
              ['apps/lks','React SPA для студентов · порт 3000'],
              ['apps/lkp','React SPA для персонала · порт 3001'],
              ['packages/types','TS-интерфейсы: User, Debt, RetakeSlot, Enrollment, Result'],
              ['packages/ui','UI-компоненты: AppShell, Button, Badge, Modal, SlotCard, Table'],
              ['packages/config','общие tsconfig.base.json и tailwind.base.ts'],
            ].map(([k,v]) => `<tr><td class="kk">${k}</td><td>${v}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`,

  'lks-features': () => `
    <div class="grid-2" style="gap:64px">
      <ul class="bullets">
        <li><b>Аутентификация:</b> МИРЭА SSO (Keycloak, PKCE) + локальный вход + 2FA</li>
        <li><b>Долги из внутренней БД</b> с кнопкой «Записаться»</li>
        <li><b>Долги с lk.mirea.ru</b> в реальном времени — HTML-парсинг через SSO-сессию</li>
        <li><b>Запись на пересдачу:</b> выбор слота, проверка мест, подтверждение</li>
      </ul>
      <ul class="bullets">
        <li><b>BR-01:</b> запись возможна не позже чем за <b>12 часов</b> до начала</li>
        <li><b>Просмотр своих записей</b> и статуса: <code>enrolled</code> · <code>completed</code> · <code>absent</code></li>
        <li><b>BR-03:</b> автоматическое закрытие задолженности при оценке ≥ 3</li>
      </ul>
    </div>
    <div class="kpi-row" style="margin-top:48px">
      <div class="kpi"><div class="v">2</div><div class="l">источника<br>задолженностей</div></div>
      <div class="kpi"><div class="v">3</div><div class="l">способа<br>аутентификации</div></div>
      <div class="kpi"><div class="v">12 ч</div><div class="l">минимум до начала<br>(BR-01)</div></div>
      <div class="kpi"><div class="v">авто</div><div class="l">закрытие долга<br>при оценке ≥ 3</div></div>
    </div>`,

  'rbac-roles': () => `
    <table class="tbl">
      <thead><tr><th style="width:18%">Роль</th><th style="width:22%">Кто</th><th>Основные права</th></tr></thead>
      <tbody>
        ${[
          ['student','Студент','Просмотр долгов, запись на пересдачи, контроль результатов'],
          ['teacher','Преподаватель','Указание доступности, список своих слотов, выставление оценок'],
          ['dept_worker','Работник кафедры','Создание и редактирование черновиков слотов'],
          ['dept_head','Заведующий кафедрой','Все права dept_worker + утверждение / отклонение черновиков'],
          ['academic_office','Учебный отдел','Публикация слотов, ручные зачисления студентов, аудит'],
          ['admin','Администратор','Полный доступ: управление пользователями + все права'],
        ].map(([r,k,p]) => `<tr><td class="role">${r}</td><td>${k}</td><td>${p}</td></tr>`).join('')}
      </tbody>
    </table>`,

  'rbac-matrix': () => {
    const rows = [
      ['Просмотр долгов', 1,0,0,0,1,1],
      ['Запись на пересдачу', 1,0,0,0,0,0],
      ['Указать доступность', 0,1,0,0,0,0],
      ['Создать черновик слота', 0,0,1,1,0,1],
      ['Утвердить черновик', 0,0,0,1,1,1],
      ['Опубликовать слот', 0,0,0,0,1,1],
      ['Ручная запись студента', 0,0,0,0,1,1],
      ['Внести результат', 0,1,0,0,0,1],
      ['Управление пользователями', 0,0,0,0,0,1],
      ['Журнал аудита', 0,0,0,0,1,1],
    ];
    return `
    <table class="tbl tbl-rbac">
      <thead>
        <tr>
          <th style="width:30%; text-align:left">Действие</th>
          <th>student</th><th>teacher</th><th>dept_<br>worker</th><th>dept_<br>head</th><th>acad_<br>office</th><th>admin</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const [name, ...vals] = r;
          return `<tr><td>${name}</td>${vals.map(v => v ? '<td class="y">✓</td>' : '<td class="n">—</td>').join('')}</tr>`;
        }).join('')}
      </tbody>
    </table>`;
  },

  integrations: () => `
    <div class="tile-grid" style="grid-template-columns:repeat(2,1fr); gap:20px">
      ${[
        ['SSO','sso.mirea.ru — Keycloak','OpenID Connect PKCE · code_verifier (64 байта) → code_challenge (SHA-256) → авторизация → обмен кода на token. Поддержка 2FA.'],
        ['gRPC','attendance.mirea.ru — Pulse','gRPC GetMeInfo → ФИО, ID преподавателя, ID группы. Один запрос на сессию, ответ кэшируется.'],
        ['HTML','lk.mirea.ru — Bitrix ЛК','Эмуляция браузерной сессии, 7-шаговый маршрут редиректов. HTML-парсинг таблицы долгов, <code>SimpleCookieJar</code>, <code>selectStudentProfile</code>.'],
        ['iCal','schedule-of.mirea.ru','REST API + iCal-фид по преподавателю. Синхронизация раз в 24 ч, проверка <code>VEVENT</code>-конфликтов при создании слота → 400 Bad Request с описанием.'],
      ].map(([k,h,p]) => `<div class="tile"><div class="ic">${k}</div><h4>${h}</h4><p>${p}</p></div>`).join('')}
    </div>`,

  db: () => `
    <table class="tbl">
      <thead><tr><th style="width:18%">Сущность</th><th>Поля и роль</th></tr></thead>
      <tbody>
        ${[
          ['User','<code>UUID</code>, fullName, email, <code>role</code> (6 значений), mireaSsoId, mireaTeacherId, groupName'],
          ['RetakeSlot','disciplineName, teacherName, datetime, room, maxStudents · status: <code>draft → approved → published → closed</code>'],
          ['TeacherAvailability','teacherId, startsAt, endsAt — стартовая точка процесса'],
          ['Enrollment','studentId, slotId, source (<code>self</code> / <code>manual</code>), status (<code>enrolled</code> / <code>completed</code> / <code>absent</code>)'],
          ['Result','enrollmentId, grade (2–5), passed, notes, recordedBy'],
          ['Debt','studentId, disciplineName, debtType, semester, status (<code>active</code> / <code>closed</code> / <code>unresolved</code>)'],
          ['AuditLog','userId, action (<code>ENROLL</code>, <code>RECORD_RESULT</code>, <code>PUBLISH_SLOT</code>…), entity, entityId, payload'],
          ['MireaScheduleItem','mireaId, type, title, iCalLink — кэш расписания МИРЭА'],
        ].map(([k,v]) => `<tr><td class="kk">${k}</td><td>${v}</td></tr>`).join('')}
      </tbody>
    </table>`,

  security: () => `
    <ul class="bullets">
      <li><b>JWT-токен</b> { sub, email, role, iat, exp } — срок действия 15 минут</li>
      <li><b>passport-jwt:</b> автоматическая верификация подписи в каждом запросе</li>
      <li><b>RolesGuard + @Roles():</b> декларативное ограничение по роли</li>
      <li><b>bcrypt:</b> хэширование паролей для локальных аккаунтов</li>
      <li><b>PKCE (Keycloak):</b> авторизация без client_secret, защита от CSRF</li>
      <li><b>Axios interceptor:</b> auto-logout фронтенда при 401</li>
      <li><b>AuditLog:</b> каждое значимое действие фиксируется</li>
      <li><b>Soft delete:</b> пользователи не удаляются физически (deletedAt)</li>
      <li><b>class-validator:</b> валидация на всех DTO</li>
    </ul>`,

  deploy: () => `
    <div class="grid-2" style="gap:48px">
      <div>
        <div style="font-size:13px; font-weight:700; color:var(--blue); letter-spacing:0.18em; text-transform:uppercase; margin-bottom:14px">Режим разработки</div>
        <ul class="bullets tight">
          <li><b>pnpm install</b> · установка всех зависимостей monorepo</li>
          <li><b>pnpm dev</b> · Turbo запускает API + LKS + LKP параллельно</li>
          <li><b>API</b>: <code>localhost:4000/api</code></li>
          <li><b>LKS</b>: <code>localhost:3000</code> · <b>LKP</b>: <code>localhost:3001</code></li>
          <li><b>pnpm build</b> · билд всех пакетов через Turbo</li>
          <li><b>pnpm lint</b> · ESLint по всему монорепо</li>
          <li><b>CORS</b>: <code>localhost:3000</code>, <code>localhost:3001</code></li>
        </ul>
      </div>
      <div>
        <div style="font-size:13px; font-weight:700; color:var(--blue); letter-spacing:0.18em; text-transform:uppercase; margin-bottom:14px">Переменные окружения</div>
        <ul class="bullets tight">
          <li><b>DATABASE_*</b> · HOST, PORT, USER, PASSWORD, NAME</li>
          <li><b>JWT_SECRET</b> · секрет для подписи JWT</li>
          <li><b>JWT_EXPIRES_IN</b> · время жизни токена (по умолчанию <code>15m</code>)</li>
          <li><b>MIREA_SSO_CLIENT_ID</b> · <code>attendance-app</code></li>
          <li><b>MIREA_SSO_REDIRECT_URI</b> · redirect URI в Keycloak</li>
          <li><b>MIREA_SCHEDULE_SYNC_INTERVAL_HOURS</b> · 24 по умолчанию</li>
        </ul>
        <div class="callout" style="margin-top:24px; font-size:18px">
          <small>Сиды данные</small>
          15 студентов + 3 преподавателя + роли admin / office / dept_head / dept_worker — вход через вкладку «Локально», пароль <code>password123</code>
        </div>
      </div>
    </div>`,

  summary: () => `
    <div class="kpi-row" style="margin-bottom:36px">
      <div class="kpi"><div class="v">3</div><div class="l">приложения: API + ЛКС + ЛКП</div></div>
      <div class="kpi"><div class="v">6</div><div class="l">ролей RBAC с разграничением</div></div>
      <div class="kpi"><div class="v">6</div><div class="l">этапов автоматизированного процесса</div></div>
      <div class="kpi"><div class="v">4</div><div class="l">интеграции с МИРЭА</div></div>
    </div>
    <div class="grid-2" style="gap:48px">
      <ul class="bullets tight">
        <li><b>Полный цикл</b> доступность → черновик → утверждение → публикация → запись → результат</li>
        <li><b>SSO Keycloak</b>, Pulse gRPC, lk.mirea.ru HTML-парсинг, расписание iCal</li>
        <li><b>8 TypeORM сущностей</b> + общий пакет типов @mirea/types</li>
      </ul>
      <ul class="bullets tight">
        <li>Автопроверка конфликтов расписания через <b>VEVENT (iCal)</b></li>
        <li><b>BR-01:</b> запись ≥ 12 ч до пересдачи. <b>BR-03:</b> автозакрытие долга при оценке ≥ 3</li>
        <li>Полный <b>журнал аудита</b>, тестовые данные: 15 студентов + 3 преподавателя</li>
      </ul>
    </div>`,

  outcomes: () => `
    <div class="grid-2" style="gap:64px">
      <div>
        <div style="font-size:13px; font-weight:700; color:var(--blue); letter-spacing:0.18em; text-transform:uppercase; margin-bottom:18px">Результаты</div>
        <ul class="bullets">
          <li>Разработана <b>полнофункциональная веб-платформа</b> для академических пересдач</li>
          <li>Автоматизирован <b>полный цикл</b>: от доступности преподавателя до фиксации оценки</li>
          <li>Реализована <b>глубокая интеграция</b> с инфраструктурой РТУ МИРЭА</li>
          <li>Применены <b>современные паттерны</b>: монорепо, RBAC, DDD, event-driven audit, iCal</li>
          <li>Система <b>готова к production</b> (Docker, Railway, Render, Vercel)</li>
        </ul>
      </div>
      <div>
        <div style="font-size:13px; font-weight:700; color:var(--blue); letter-spacing:0.18em; text-transform:uppercase; margin-bottom:18px">Направления развития</div>
        <ul class="bullets">
          <li><b>Push / email уведомления</b> о новых слотах и результатах</li>
          <li><b>Аналитический дашборд</b> по пересдачам — KPI по кафедрам и дисциплинам</li>
          <li><b>Мобильное приложение</b> на React Native — общий пакет @mirea/types</li>
          <li><b>Маркетплейс правил</b> для разных кафедр (BR-01 / BR-03 настраиваемые)</li>
        </ul>
      </div>
    </div>`,
};

function renderContent(s) {
  const body = (BODY[s.body] || (() => ''))();
  return `
<section data-screen-label="${s.label}">
  ${bar(s.meta)}
  <div class="stage">
    <div class="eyebrow">${s.eyebrow}</div>
    <h2 class="title">${s.title}</h2>
    <div class="rule"></div>
    ${body}
  </div>
  ${foot(s.foot)}
</section>`;
}

function renderShotDual(s) {
  const side = s.side || {};
  const bullets = (side.bullets || []).map(b => `<li>${b}</li>`).join('');
  const browsers = (s.images || []).map(im => `
    <div class="browser">
      <div class="bb"><i></i><i></i><i></i><div class="url">${im.url || ''}</div></div>
      <div class="bd contain"><img src="${im.src}" alt="${im.caption || ''}" loading="eager" decoding="sync"></div>
      ${im.caption ? `<div class="shot-cap">${im.caption}</div>` : ''}
    </div>`).join('');
  const sideBlock = `
    <div class="shot-side">
      ${side.what ? `<div class="what">${side.what}</div>` : ''}
      ${side.heading ? `<h3>${side.heading}</h3>` : ''}
      ${side.lead ? `<p class="lead">${side.lead}</p>` : ''}
      ${bullets ? `<ul class="bullets">${bullets}</ul>` : ''}
      ${side.stampN ? `<div class="stamp"><div class="step-dot">${side.stampN}</div><div>${side.stampT || ''}</div></div>` : ''}
    </div>`;
  return `
<section data-screen-label="${s.label}">
  ${bar(s.meta)}
  <div class="stage" style="padding-bottom:32px">
    <div class="eyebrow">${s.eyebrow}</div>
    <h2 class="title sm" style="margin-bottom:18px">${s.sectionTitle}</h2>
    <div class="rule" style="margin-bottom:24px"></div>
    <div class="shot-split shot-dual">
      <div class="shot-dual-stack">${browsers}</div>
      ${sideBlock}
    </div>
  </div>
  ${foot(s.foot)}
</section>`;
}

function renderSlide(s) {
  switch (s.kind) {
    case 'cover':     return renderCover(s);
    case 'thanks':    return renderThanks(s);
    case 'divider':   return renderDivider(s);
    case 'bpmn':      return renderBpmn(s);
    case 'shot':      return renderShot(s);
    case 'shot-dual': return renderShotDual(s);
    case 'content':   return renderContent(s);
    default: return '';
  }
}

export function buildHtml() {
  const slides = SLIDES.map(renderSlide).join('\n');
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Система пересдач РТУ МИРЭА — Курсовой проект</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="mirea-deck.css">
</head>
<body>
<deck-stage>
${slides}
</deck-stage>

<script src="deck-stage.js"></script>
<script>
  (function(){
    const root = document.querySelector('deck-stage');
    if (!root) return;
    const slides = [...root.children].filter(el => el.tagName === 'SECTION');
    const total = slides.length;
    const pad = n => String(n).padStart(2,'0');
    slides.forEach((s, i) => {
      const n = i + 1;
      const text = pad(n) + ' / ' + pad(total);
      s.querySelectorAll('.pg').forEach(el => el.textContent = text);
      s.querySelectorAll('.pg-corner b').forEach(el => el.textContent = pad(n) + ' / ' + pad(total));
      s.querySelectorAll('.pg-foot').forEach(el => el.textContent = text);
    });
  })();
</script>
</body>
</html>`;
}
