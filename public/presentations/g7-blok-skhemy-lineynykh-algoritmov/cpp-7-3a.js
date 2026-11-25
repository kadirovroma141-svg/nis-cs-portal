/* Помощники презентаций раздела 7.3А «Программирование линейных алгоритмов (C++)».
   Подключается после deck.js и lesson.js. Состояние — в window.DECK_STATE (как у виджетов LESSON).
   CPP.flow  — блок-схема линейного алгоритма (SVG: терминатор, параллелограмм, прямоугольник);
   CPP.code  — код C++ (номера строк, подсветка строк);
   CPP.screen — консольный экран (ввод пользователя — [[…]]);
   CPP.fill  — таблица с ответами, которые открываются щелчком по ячейке ("?ответ"). */
(function () {
  const S = () => window.DECK_STATE;
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const CPP = {
    /**
     * nodes: [[kind, label, opts?]], kind: "t" — начало/конец, "io" — ввод/вывод, "p" — действие.
     * opts.hide — показывать «?» вместо подписи, пока не открыт ключ o.show.
     * o: { key, show, maxH, w }.
     */
    flow(nodes, o = {}) {
      const W = o.w || 360, H = 46, G = 26, X = 10, N = nodes.length;
      const total = N * H + (N - 1) * G + 8;
      const id = "fa-" + (o.key || Math.random().toString(36).slice(2, 7));
      let out = "";
      nodes.forEach(([kind, label, opt = {}], i) => {
        const y = 4 + i * (H + G);
        const cx = X + W / 2;
        const hidden = opt.hide && !(o.show && S().revealed[o.show]);
        const t = hidden ? "?" : label;
        const cls = kind === "t" ? "blk-p" : kind === "io" ? "blk-a" : "blk";
        if (kind === "io") {
          const k = 18;
          out += `<polygon class="${cls}" points="${X + k},${y} ${X + W},${y} ${X + W - k},${y + H} ${X},${y + H}"/>`;
        } else {
          out += `<rect class="${cls}" x="${X}" y="${y}" width="${W}" height="${H}" rx="${kind === "t" ? 23 : 4}"/>`;
        }
        const small = String(t).length > 26 ? ' class="s" style="font-weight:700;fill:var(--fg)"' : "";
        out += `<text${small} x="${cx}" y="${y + H / 2 + 6}" text-anchor="middle">${esc(t)}</text>`;
        if (i < N - 1) out += `<path class="ar" d="M${cx} ${y + H} V${y + H + G - 3}" marker-end="url(#${id})"/>`;
      });
      return `<svg class="dia" viewBox="0 0 ${W + 2 * X} ${total}" style="max-height:${o.maxH || 440}px" role="img" aria-label="Блок-схема">
        <defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--primary)"/></marker></defs>${out}</svg>`;
    },

    /** Код C++. o: { ln: true — номера строк, hl: [номера строк], size: px, title } */
    code(src, o = {}) {
      const lines = String(src).replace(/^\n/, "").replace(/\s+$/, "").split("\n");
      const w = String(lines.length).length;
      const body = lines
        .map((l, i) => {
          const n = o.ln ? `<span style="opacity:.45;user-select:none;">${String(i + 1).padStart(w, " ")}  </span>` : "";
          const on = (o.hl || []).includes(i + 1);
          return `<span style="display:block;${on ? "background:rgba(255,200,60,.22);border-radius:4px;" : ""}">${n}${esc(l) || " "}</span>`;
        })
        .join("");
      return `<div>${o.title ? `<div class="text-xs text-muted" style="margin-bottom:4px;font-weight:700;">${o.title}</div>` : ""}<pre class="code-block" style="font-size:${o.size || 16}px;line-height:1.45;white-space:pre;overflow:auto;">${body}</pre></div>`;
    },

    /** Консольный экран. Ввод пользователя записывается как [[…]]. */
    screen(text, o = {}) {
      const html = esc(String(text).replace(/^\n/, "").replace(/\s+$/, "")).replace(/\[\[(.*?)\]\]/g, '<b style="color:#7fd1ff;">$1</b>');
      return `<div>${o.title !== "" ? `<div class="text-xs text-muted" style="margin-bottom:4px;font-weight:700;">${o.title || "На экране"}</div>` : ""}<pre class="code-block" style="font-size:${o.size || 16}px;line-height:1.45;white-space:pre-wrap;border:2px solid var(--border-strong);">${html}</pre></div>`;
    },

    /**
     * Таблица: ячейка "?ответ" скрыта, пока по ней не щёлкнут. Кнопка открывает все ответы.
     * head: [..], rows: [[..]]; ячейки — HTML.
     */
    fill(key, head, rows, o = {}) {
      const st = S();
      const all = st.revealed[`${key}:all`];
      let total = 0;
      let shown = 0;
      const body = rows
        .map(
          (r, ri) =>
            `<tr>${r
              .map((v, ci) => {
                const s = String(v);
                if (!s.startsWith("?")) return `<td>${s}</td>`;
                total++;
                const k = `${key}:${ri},${ci}`;
                const on = all || st.revealed[k];
                if (on) shown++;
                return `<td class="pick ${on ? "cell-ok" : ""}" onclick="DECK.toggleReveal('${k}')">${on ? s.slice(1) : '<span class="text-muted">…</span>'}</td>`;
              })
              .join("")}</tr>`
        )
        .join("");
      return `<table class="t pickable" style="${o.style || ""}"><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>${body}</table>
        <div class="flex-between"><span class="text-xs text-muted">Щёлкните по ячейке «…», чтобы открыть ответ.</span>
        <button type="button" class="btn" onclick="DECK.toggleReveal('${key}:all')">${all ? "Скрыть ответы" : `Открыть все (${shown}/${total})`}</button></div>`;
    },
  };

  window.CPP = CPP;
})();
