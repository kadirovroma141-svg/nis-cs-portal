/* Shared interactive widgets for decks built by the KTP/КСП template (with lesson.css).
   Every widget keeps its state in window.DECK_STATE and re-renders through window.DECK. */
(function () {
  const S = () => window.DECK_STATE;
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const L = {
    /** Строка «Источник: …» внизу слайда. */
    src: (t) => `<div class="src">${t}</div>`,

    /** Кнопка «Показать ответ» и скрытый блок. */
    reveal(key, label, html) {
      const on = S().revealed[key];
      return `<button type="button" class="btn btn-primary reveal-btn" onclick="DECK.toggleReveal('${key}')">${on ? "Скрыть" : label}</button>${on ? `<div class="answer">${html}</div>` : ""}`;
    },

    /** Утверждения: щелчок показывает «верно» / «ошибка» и пояснение. items: [{t, ok, why}] */
    statements(key, items) {
      return `<div class="opts">${items
        .map((it, i) => {
          const k = `${key}:${i}`;
          const shown = S().revealed[k];
          const cls = shown ? (it.ok ? "ok" : "bad") : "";
          const tag = shown ? (it.okLabel && it.ok ? it.okLabel : it.badLabel && !it.ok ? it.badLabel : it.ok ? "✓ верно" : "✗ ошибка") + (it.why ? ` — ${it.why}` : "") : "";
          return `<button type="button" class="opt ${cls}" onclick="DECK.toggleReveal('${k}')"><span class="n">${it.n ?? i + 1}</span><span>${it.t}</span><span class="why">${tag}</span></button>`;
        })
        .join("")}</div>`;
    },

    /** Ситуация → вариант из списка. choices: [[id, label]], rows: [{t, ans}] */
    matcher(key, choices, rows) {
      let right = 0;
      const html = rows
        .map((r, i) => {
          const k = `${key}:${i}`;
          const pick = S().selected[k];
          if (pick === r.ans) right++;
          const cls = pick ? (pick === r.ans ? "ok" : "bad") : "";
          const chips = choices.map(([id, name]) => `<button type="button" class="chip ${pick === id ? "on" : ""}" onclick="DECK.setSelected('${k}','${id}')">${name}</button>`).join("");
          return `<div class="match-row ${cls}"><div>${r.t}</div><div class="chips">${chips}</div></div>`;
        })
        .join("");
      return `<div class="match">${html}</div><div class="score" style="text-align:right;">Верно: ${right} из ${rows.length}</div>`;
    },

    /** Вопрос с выбором ответа. */
    quiz(key, q, opts, right) {
      const pick = S().quiz[key];
      return `<div class="stack"><div class="font-bold">${q}</div><div class="opts">${opts
        .map((o, i) => {
          const cls = pick === undefined ? "" : i === right ? "ok" : i === pick ? "bad" : "";
          return `<button type="button" class="opt ${cls}" onclick="DECK.pickQuiz('${key}', ${i})"><span class="n">${"abcd"[i]})</span><span>${o}</span></button>`;
        })
        .join("")}</div></div>`;
    },

    /**
     * Таблица, где ученики ищут ячейки с ошибками: щелчок по ячейке подсвечивает её
     * (красным — ошибка с пояснением, зелёным — верное значение).
     * head: [..], rows: [[..]], errors: {"r,c": "пояснение"}
     */
    errorTable(key, head, rows, errors) {
      const st = S();
      let found = 0;
      const total = Object.keys(errors).length;
      const body = rows
        .map(
          (r, ri) =>
            `<tr>${r
              .map((v, ci) => {
                const k = `${key}:${ri},${ci}`;
                const on = st.revealed[k];
                const err = errors[`${ri},${ci}`];
                if (on && err) found++;
                const cls = on ? (err ? "cell-bad" : "cell-ok") : "";
                return `<td class="pick ${cls}" onclick="DECK.toggleReveal('${k}')">${esc(v)}${on && err ? `<div class="cell-why">${err}</div>` : ""}</td>`;
              })
              .join("")}</tr>`
        )
        .join("");
      return `<table class="t pickable"><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>${body}</table>
        <div class="score" style="text-align:right;">Найдено ошибок: ${found} из ${total}</div>`;
    },

    /**
     * Поле или запись: щелчок по заголовку столбца выделяет поле, по номеру строки — запись.
     */
    fieldRecord(key, head, rows) {
      const sel = S().selected[key] || "";
      const col = sel.startsWith("c") ? Number(sel.slice(1)) : -1;
      const row = sel.startsWith("r") ? Number(sel.slice(1)) : -1;
      const label =
        col >= 0
          ? `<b>Поле</b> «${esc(head[col])}» — столбец: одна характеристика всех объектов.`
          : row >= 0
            ? `<b>Запись</b> № ${row + 1} — строка: все сведения об одном объекте.`
            : "Щёлкните по названию столбца или по номеру строки.";
      const th = head.map((h, i) => `<th class="pick ${col === i ? "hl" : ""}" onclick="DECK.setSelected('${key}','c${i}')">${esc(h)}</th>`).join("");
      const body = rows
        .map(
          (r, ri) =>
            `<tr><td class="pick rownum ${row === ri ? "hl" : ""}" onclick="DECK.setSelected('${key}','r${ri}')">${ri + 1}</td>${r
              .map((v, ci) => `<td class="${col === ci || row === ri ? "hl" : ""}">${esc(v)}</td>`)
              .join("")}</tr>`
        )
        .join("");
      return `<table class="t pickable"><tr><th class="rownum">№</th>${th}</tr>${body}</table><div class="note">${label}</div>`;
    },

    /**
     * Расставь шаги по порядку: ученики щёлкают шаги в правильной последовательности.
     * steps — в правильном порядке; shuffle — порядок показа (индексы steps).
     */
    orderGame(key, steps, shuffle) {
      const st = S();
      const done = (st.selected[key] || "").split(",").filter(Boolean).map(Number);
      const miss = st.selected[`${key}:miss`];
      const next = done.length;
      const left = shuffle
        .map((idx) => {
          const used = done.includes(idx);
          const bad = miss === String(idx);
          return `<button type="button" class="opt ${used ? "ok" : bad ? "bad" : ""}" ${used ? "disabled" : ""} onclick="LESSON.orderPick('${key}', ${idx}, ${next})"><span>${steps[idx]}</span></button>`;
        })
        .join("");
      const right = done.map((idx) => `<div class="step">${steps[idx]}</div>`).join("");
      return `<div class="grid-2 ordergame" style="gap:18px;"><div class="opts">${left}</div><div class="steps">${right || '<div class="text-muted text-sm">Щёлкайте шаги по порядку — здесь соберётся алгоритм.</div>'}</div></div>`;
    },
    orderPick(key, idx, expected) {
      const st = S();
      const done = (st.selected[key] || "").split(",").filter(Boolean);
      if (idx === expected) {
        done.push(String(idx));
        st.selected[`${key}:miss`] = "";
        window.DECK.setSelected(key, done.join(","));
      } else {
        window.DECK.setSelected(`${key}:miss`, String(idx));
      }
    },
  };

  window.LESSON = L;
})();
