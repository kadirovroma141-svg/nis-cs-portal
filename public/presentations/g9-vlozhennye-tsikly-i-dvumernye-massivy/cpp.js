/* Виджеты раздела 9.3А «Массивы (C++)» поверх движка (_engine/deck.js + lesson.js).
   Движок не меняется: состояние хранится в window.DECK_STATE, перерисовка — через window.DECK. */
(function () {
  const S = () => window.DECK_STATE;
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const css = `
.lesson .code-block.cpp { font-size: 15px; line-height: 1.45; padding: 12px 14px; }
.lesson .code-block.cpp.sm { font-size: 13.5px; line-height: 1.4; }
.lesson .code-block.cpp.lg { font-size: 17px; }
.cpp .kw { color: #8fb4ff; font-weight: 700; }
.cpp .ty { color: #6fd3c2; font-weight: 700; }
.cpp .st { color: #f2c46d; }
.cpp .nu { color: #ff9e7a; }
.cpp .cm { color: #9a9a9a; font-style: italic; }
.cpp .gap { color: #1a1a1a; background: #f2c46d; border-radius: 4px; padding: 0 2px; }
.cpp .mark { background: rgba(255, 214, 102, .22); border-radius: 4px; }
.lesson table.tr { width: 100%; border-collapse: collapse; font-size: 14.5px; font-family: ui-monospace, Menlo, monospace; }
.lesson table.tr th, .lesson table.tr td { border: 1px solid var(--border); padding: 2px 8px; text-align: center; height: 25px; }
.lesson table.tr th { background: var(--primary-soft); color: var(--primary); }
.lesson table.tr tr.cur td { background: var(--accent-soft); }
.lesson table.tr td.f { color: var(--danger); font-weight: 700; }
.lesson table.tr td.t { color: var(--success); font-weight: 700; }
.lesson .trbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.lesson .trbar .btn { padding: 6px 12px; }
.lesson table.mx { width: auto; border-collapse: collapse; font-family: ui-monospace, Menlo, monospace; font-size: 18px; }
.lesson table.mx td, .lesson table.mx th { border: 1px solid var(--border); width: 52px; height: 42px; text-align: center; }
.lesson table.mx th { background: var(--surface-2); color: var(--muted); font-size: 14px; font-weight: 700; }
.lesson table.mx td { cursor: pointer; background: var(--surface); }
.lesson table.mx td:hover { outline: 2px solid var(--primary); outline-offset: -2px; }
.lesson table.mx.sm td, .lesson table.mx.sm th { height: 32px; width: 46px; font-size: 16px; }
.lesson table.mx td.on { background: var(--primary); color: var(--primary-fg); font-weight: 800; }
.lesson table.mx td.hl { background: var(--accent-soft); outline: 2px solid var(--accent); outline-offset: -2px; font-weight: 800; }
.lesson table.mx td.row, .lesson table.mx td.col { background: var(--primary-soft); }
.lesson .mxinfo { font-family: ui-monospace, Menlo, monospace; font-size: 19px; font-weight: 700; }
.lesson .out { font-family: ui-monospace, Menlo, monospace; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; white-space: pre; font-size: 16px; line-height: 1.35; }
.lesson .tight { gap: 10px !important; }
.lesson .grid-code { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; align-items: start; }
.lesson .grid-code.w { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); }
`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const KW = new Set(["for", "while", "do", "if", "else", "return", "using", "namespace", "include", "cout", "cin", "endl", "srand", "rand", "time", "setw", "swap"]);
  const TY = new Set(["int", "double", "char", "float", "string", "bool", "void", "main", "std"]);

  /** Подсветка C++: комментарии, строки, ключевые слова, числа, пропуски ____ и метки [[…]]. */
  function hl(src) {
    const out = [];
    const re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(_{3,})|(\[\[|\]\])|([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?)|([\s\S])/g;
    let m;
    while ((m = re.exec(src))) {
      if (m[1]) out.push(`<span class="cm">${esc(m[1])}</span>`);
      else if (m[2]) out.push(`<span class="st">${esc(m[2])}</span>`);
      else if (m[3]) out.push(`<span class="gap">${m[3].replace(/_/g, "&nbsp;")}</span>`);
      else if (m[4]) out.push(m[4] === "[[" ? '<span class="mark">' : "</span>");
      else if (m[5]) out.push(KW.has(m[5]) ? `<span class="kw">${m[5]}</span>` : TY.has(m[5]) ? `<span class="ty">${m[5]}</span>` : m[5]);
      else if (m[6]) out.push(`<span class="nu">${m[6]}</span>`);
      else out.push(esc(m[7]));
    }
    return out.join("");
  }

  const CPP = {
    hl,
    /** Блок кода. size: "sm" | "lg" | "" */
    code: (src, size = "") => `<div class="code-block cpp ${size}">${hl(src.replace(/^\n/, ""))}</div>`,

    /** Вывод программы (моноширинный блок). */
    out: (text) => `<div class="out">${esc(text)}</div>`,

    /**
     * Трассировочная таблица с пошаговым показом строк.
     * head: [..]; rows: [[..]] — значения "t"/"f" подсвечиваются (true/false).
     */
    trace(key, head, rows) {
      const n = Math.min(Number(S().selected[key] || 0), rows.length);
      const body = rows
        .map((r, ri) => {
          const shown = ri < n;
          return `<tr class="${shown && ri === n - 1 ? "cur" : ""}">${r
            .map((v) => {
              const val = shown ? v : "";
              const cls = shown && (v === "f" || v === "false") ? "f" : shown && (v === "t" || v === "true") ? "t" : "";
              return `<td class="${cls}">${esc(val)}</td>`;
            })
            .join("")}</tr>`;
        })
        .join("");
      return `<div class="stack tight">
        <div class="trbar">
          <button type="button" class="btn btn-primary" onclick="CPP.step('${key}', 1, ${rows.length})" ${n >= rows.length ? "disabled" : ""}>▶ Шаг</button>
          <button type="button" class="btn" onclick="CPP.step('${key}', ${rows.length}, ${rows.length})">Все шаги</button>
          <button type="button" class="btn" onclick="CPP.step('${key}', -${rows.length}, ${rows.length})">Сброс</button>
          <span class="score">Шаг ${n} из ${rows.length}</span>
        </div>
        <table class="tr"><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>${body}</table>
      </div>`;
    },
    step(key, d, max) {
      const n = Math.max(0, Math.min(max, Number(S().selected[key] || 0) + d));
      window.DECK.setSelected(key, String(n));
    },

    /**
     * Матрица с индексами: щелчок по ячейке показывает name[i][j] = значение.
     * opts.modes: [{id, label, fn(i, j, v, n) → bool, info(cells) → html}] — подсветка областей.
     */
    matrix(key, data, opts = {}) {
      const st = S();
      const name = opts.name || "a";
      const pick = st.selected[key] || "";
      const [pi, pj] = pick ? pick.split(",").map(Number) : [-1, -1];
      const modes = opts.modes || [];
      const mode = modes.find((m) => m.id === st.selected[`${key}:mode`]);
      const n = data.length;
      const cells = [];
      const head = `<tr><th></th>${data[0].map((_, j) => `<th>j=${j}</th>`).join("")}</tr>`;
      const body = data
        .map(
          (row, i) =>
            `<tr><th>i=${i}</th>${row
              .map((v, j) => {
                const inMode = mode && mode.fn(i, j, v, n);
                if (inMode) cells.push(v);
                const cls = i === pi && j === pj ? "on" : inMode ? "hl" : opts.cross && (i === pi || j === pj) ? "row" : "";
                return `<td class="${cls}" onclick="DECK.setSelected('${key}','${i},${j}')">${esc(v)}</td>`;
              })
              .join("")}</tr>`
        )
        .join("");
      const info = pi >= 0 ? `${name}[${pi}][${pj}] = ${esc(data[pi][pj])}` : opts.hint || "Щёлкните по ячейке — появятся её индексы.";
      const chips = modes.length
        ? `<div class="chips" style="flex-wrap:wrap;">${modes
            .map((m) => `<button type="button" class="chip ${mode && mode.id === m.id ? "on" : ""}" onclick="DECK.setSelected('${key}:mode','${mode && mode.id === m.id ? "" : m.id}')">${m.label}</button>`)
            .join("")}</div>`
        : "";
      return `<div class="stack tight">${chips}<table class="mx ${opts.small ? "sm" : ""}">${head}${body}</table>
        <div class="mxinfo">${info}</div>${mode && mode.info ? `<div class="note">${mode.info(cells)}</div>` : ""}</div>`;
    },

    /** Генератор: заполняет матрицу n×m числами start + rand() % (end - start + 1) (имитация в браузере). */
    randMatrix(key, n, m, start, end, w = 3) {
      const st = S();
      let data = null;
      try { data = JSON.parse(st.selected[key] || "null"); } catch { data = null; }
      const rows = data
        ? data.map((r) => r.map((v) => String(v).padStart(w, " ") + ", ").join("")).join("\n")
        : "Нажмите «Запустить», чтобы заполнить массив.";
      return `<div class="stack tight">
        <div class="trbar"><button type="button" class="btn btn-primary" onclick="CPP.gen('${key}', ${n}, ${m}, ${start}, ${end})">▶ Запустить</button>
        <span class="text-xs text-muted">setw(${w}) — каждое число занимает ${w} позиции</span></div>
        <div class="out">${esc(rows)}</div></div>`;
    },
    gen(key, n, m, start, end) {
      const data = Array.from({ length: n }, () => Array.from({ length: m }, () => start + Math.floor(Math.random() * (end - start + 1))));
      window.DECK.setSelected(key, JSON.stringify(data));
    },
  };

  window.CPP = CPP;
})();
