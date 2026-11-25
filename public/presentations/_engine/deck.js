/* Shared Interactive Presentation Engine */
(function () {
  function syncThemeFromParent() {
    try {
      const parentHtml = window.parent && window.parent !== window ? window.parent.document.documentElement : null;
      const t = parentHtml ? parentHtml.getAttribute("data-theme") : null;
      if (t === "dark" || t === "light") {
        document.documentElement.setAttribute("data-theme", t);
        return;
      }
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
      }
    } catch {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function initDeck(config) {
    syncThemeFromParent();
    try {
      if (window.parent && window.parent !== window) {
        const obs = new MutationObserver(syncThemeFromParent);
        obs.observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      }
    } catch {}

    const state = Object.assign(
      {
        slide: 0,
        showNotes: false,
        showGrid: false,
        revealed: {},
        quiz: {},
        tabs: {},
        selected: {},
        editors: {},
        miniAppActive: {},
      },
      config.initialState || {}
    );

    const slides = config.slides || [];
    window.DECK_STATE = state;
    window.DECK_ESC = esc;

    document.body.innerHTML = `
      <div class="deck-shell">
        <header class="deck-header">
          <div class="deck-brand">
            <span class="deck-badge mono">${esc(config.badge || "10.2А")}</span>
            <div class="deck-meta">
              <div class="deck-title">${esc(config.title)}</div>
              <div class="deck-sub">${esc(config.subtitle || "")}</div>
            </div>
          </div>
          <div class="deck-controls">
            <button id="d-grid" type="button" class="btn">Все слайды</button>
            <button id="d-notes" type="button" class="btn">Заметки (КСП)</button>
            <button id="d-theme" type="button" class="btn" title="Переключить тему">◐</button>
            <div class="nav-group">
              <button id="d-prev" type="button" title="Назад (←)">←</button>
              <span id="d-counter" class="nav-counter mono">1 / ${slides.length}</span>
              <button id="d-next" type="button" title="Вперёд (→)">→</button>
            </div>
          </div>
        </header>
        <div class="progress-track"><div id="d-progress" class="progress-fill" style="width:10%"></div></div>

        <main class="deck-main">
          <section id="d-overview" class="overview-panel hidden">
            <div class="flex-between">
              <strong>Навигация по слайдам (${slides.length} слайдов · 80 минут)</strong>
              <button id="d-overview-close" type="button" class="btn">Закрыть ✕</button>
            </div>
            <div id="d-overview-grid" class="overview-grid"></div>
          </section>

          <article id="d-stage" class="slide-card"></article>

          <aside id="d-notes-box" class="notes-panel hidden">
            <div class="flex-between" style="padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid var(--border);">
              <div class="flex-row">
                <strong style="font-size:12px;text-transform:uppercase;color:var(--primary);">Заметки учителя (КСП)</strong>
                <span id="d-notes-time" class="pill mono"></span>
              </div>
              <span id="d-notes-src" class="text-xs text-muted"></span>
            </div>
            <p id="d-notes-text" class="mt-0 mb-0 text-sm"></p>
          </aside>
        </main>

        <footer class="deck-footer">
          <span>Клавиши: <kbd>←</kbd> <kbd>→</kbd> слайды · <kbd>N</kbd> заметки · <kbd>G</kbd> сетка</span>
          <span>${esc(config.footer || "НИШ ЕМН г. Кызылорда · 10 класс · 2 четверть · Мини-HTML (/html)")}</span>
        </footer>
      </div>
    `;

    function renderStage() {
      const stage = document.getElementById("d-stage");
      const sl = slides[state.slide];
      const topHtml = `
        <div class="slide-top">
          <span class="pill ${sl.pillClass || ""}">${esc(sl.badge || "")}</span>
          <span class="timing mono">${esc(sl.timing || "")}</span>
        </div>
      `;
      stage.innerHTML = topHtml + sl.render(state, api);
      if (typeof sl.afterRender === "function") {
        sl.afterRender(state, api);
      }
      // Sync live srcdoc iframes if present
      stage.querySelectorAll("iframe[data-srcdoc-key]").forEach((frame) => {
        const key = frame.getAttribute("data-srcdoc-key");
        if (key && state.editors[key] !== undefined) {
          frame.srcdoc = state.editors[key];
        }
      });
    }

    function renderAll() {
      renderStage();
      document.getElementById("d-counter").textContent = `${state.slide + 1} / ${slides.length}`;
      document.getElementById("d-progress").style.width = `${((state.slide + 1) / slides.length) * 100}%`;
      document.getElementById("d-prev").disabled = state.slide === 0;
      document.getElementById("d-next").disabled = state.slide === slides.length - 1;

      const sl = slides[state.slide];
      const notesBox = document.getElementById("d-notes-box");
      notesBox.classList.toggle("hidden", !state.showNotes);
      document.getElementById("d-notes-time").textContent = sl.timing || "";
      document.getElementById("d-notes-src").textContent = sl.source || "";
      document.getElementById("d-notes-text").textContent = sl.notes || "";

      const ov = document.getElementById("d-overview");
      ov.classList.toggle("hidden", !state.showGrid);
      document.getElementById("d-overview-grid").innerHTML = slides
        .map(
          (s, i) => `
          <button type="button" class="overview-item ${i === state.slide ? "current" : ""}" onclick="DECK.go(${i})">
            <div class="flex-between text-xs text-muted" style="margin-bottom:4px;">
              <strong class="mono">#${i + 1}</strong>
              <span class="mono">${esc(s.timing || "")}</span>
            </div>
            <div class="font-bold">${esc(s.shortTitle || s.badge || `Слайд ${i + 1}`)}</div>
          </button>`
        )
        .join("");
    }

    const api = {
      esc,
      render: renderStage,
      renderAll,
      go(i) {
        state.slide = Math.max(0, Math.min(slides.length - 1, i));
        state.showGrid = false;
        renderAll();
      },
      toggleReveal(key) {
        state.revealed[key] = !state.revealed[key];
        renderStage();
      },
      setTab(key, val) {
        state.tabs[key] = val;
        renderStage();
      },
      setSelected(key, val) {
        state.selected[key] = val;
        renderStage();
      },
      pickQuiz(key, val) {
        state.quiz[key] = val;
        renderStage();
      },
      updateEditor(key, val) {
        state.editors[key] = val;
        const frame = document.querySelector(`iframe[data-srcdoc-key="${key}"]`);
        if (frame) frame.srcdoc = val;
      },
      resetEditor(key, initialVal) {
        state.editors[key] = initialVal;
        renderStage();
      },
      renderMiniHtmlTask(opts) {
        const taskUrl = `/html?task=${encodeURIComponent(opts.taskId)}`;
        const key = opts.key || opts.taskId;
        const loaded = state.miniAppActive[key] !== false;
        return `
          <div class="stack">
            <div class="flex-between">
              <div>
                <h2 class="slide-h2">${esc(opts.title)}</h2>
                <p class="lead">${esc(opts.summary)}</p>
              </div>
              <div class="flex-row">
                <a class="btn btn-accent" href="${taskUrl}" target="_blank" rel="noopener noreferrer">Открыть Мини-HTML ↗</a>
                <button type="button" class="btn" onclick="DECK.reloadMiniApp('${esc(key)}','${taskUrl}')">↻ Сбросить окно</button>
              </div>
            </div>
            ${
              opts.steps && opts.steps.length
                ? `<div class="box-primary text-xs"><strong>Задачи урока:</strong> ${opts.steps.map(esc).join(" · ")}</div>`
                : ""
            }
            <div class="miniapp-shell">
              <div class="miniapp-bar">
                <div class="flex-row">
                  <span class="deck-badge mono">&lt;/&gt; Мини-HTML</span>
                  <span class="mono text-xs text-muted">${esc(taskUrl)}</span>
                </div>
                <span class="pill pill-success">${esc(opts.meta || "Живое мини-приложение сайта · автопроверка")}</span>
              </div>
              ${
                loaded
                  ? `<iframe id="miniapp-${esc(key)}" class="miniapp-iframe" src="${taskUrl}" title="${esc(opts.title)}" allow="clipboard-read; clipboard-write"></iframe>`
                  : `<div style="padding:36px;text-align:center;">
                       <button type="button" class="btn btn-primary" onclick="DECK.openMiniApp('${esc(key)}')">Запустить Мини-HTML прямо в слайде</button>
                     </div>`
              }
            </div>
          </div>
        `;
      },
      renderMiniSubdTask(opts) {
        const appUrl = "/subd";
        const key = opts.key || "subd";
        const loaded = state.miniAppActive[key] !== false;
        return `
          <div class="stack">
            <div class="flex-between">
              <div>
                <h2 class="slide-h2">${esc(opts.title)}</h2>
                <p class="lead">${esc(opts.summary)}</p>
              </div>
              <div class="flex-row">
                <a class="btn btn-accent" href="${appUrl}" target="_blank" rel="noopener noreferrer">Открыть Мини-СУБД ↗</a>
                <button type="button" class="btn" onclick="DECK.reloadMiniApp('${esc(key)}','${appUrl}')">↻ Обновить окно</button>
              </div>
            </div>
            <div class="box-primary text-xs">
              <strong>В Мини-СУБД нажмите «✓ Задания» справа вверху</strong> и выберите: <strong>${esc(opts.taskName)}</strong>
              ${opts.steps && opts.steps.length ? `<div style="margin-top:4px;">Шаги: ${opts.steps.map(esc).join(" · ")}</div>` : ""}
            </div>
            <div class="miniapp-shell">
              <div class="miniapp-bar">
                <div class="flex-row">
                  <span class="deck-badge mono">🗄 Мини-СУБД</span>
                  <span class="mono text-xs text-muted">/subd · ${esc(opts.taskName)}</span>
                </div>
                <span class="pill pill-success">${esc(opts.meta || "Живой симулятор Access · автопроверка")}</span>
              </div>
              ${
                loaded
                  ? `<iframe id="miniapp-${esc(key)}" class="miniapp-iframe" src="${appUrl}" title="${esc(opts.title)}" allow="clipboard-read; clipboard-write"></iframe>`
                  : `<div style="padding:36px;text-align:center;">
                       <button type="button" class="btn btn-primary" onclick="DECK.openMiniApp('${esc(key)}')">Запустить Мини-СУБД прямо в слайде</button>
                     </div>`
              }
            </div>
          </div>
        `;
      },
      renderMiniExcelTask(opts) {
        const taskUrl = opts.taskId ? `/excel?task=${encodeURIComponent(opts.taskId)}` : "/excel";
        const key = opts.key || opts.taskId || "excel";
        const loaded = state.miniAppActive[key] !== false;
        return `
          <div class="stack">
            <div class="flex-between">
              <div>
                <h2 class="slide-h2">${esc(opts.title)}</h2>
                <p class="lead">${esc(opts.summary)}</p>
              </div>
              <div class="flex-row">
                <a class="btn btn-accent" href="${taskUrl}" target="_blank" rel="noopener noreferrer">Открыть Мини-Таблицы ↗</a>
                <button type="button" class="btn" onclick="DECK.reloadMiniApp('${esc(key)}','${taskUrl}')">↻ Сбросить окно</button>
              </div>
            </div>
            ${
              opts.steps && opts.steps.length
                ? `<div class="box-primary text-xs"><strong>Задачи урока:</strong> ${opts.steps.map(esc).join(" · ")}</div>`
                : ""
            }
            <div class="miniapp-shell">
              <div class="miniapp-bar">
                <div class="flex-row">
                  <span class="deck-badge mono">📊 Мини-Таблицы</span>
                  <span class="mono text-xs text-muted">${esc(taskUrl)}</span>
                </div>
                <span class="pill pill-success">${esc(opts.meta || "Живой тренажёр Excel · автопроверка")}</span>
              </div>
              ${
                loaded
                  ? `<iframe id="miniapp-${esc(key)}" class="miniapp-iframe" src="${taskUrl}" title="${esc(opts.title)}" allow="clipboard-read; clipboard-write"></iframe>`
                  : `<div style="padding:36px;text-align:center;">
                       <button type="button" class="btn btn-primary" onclick="DECK.openMiniApp('${esc(key)}')">Запустить Мини-Таблицы прямо в слайде</button>
                     </div>`
              }
            </div>
          </div>
        `;
      },
      openMiniApp(key) {
        state.miniAppActive[key] = true;
        renderStage();
      },
      reloadMiniApp(key, url) {
        const el = document.getElementById(`miniapp-${key}`);
        if (el) el.src = url;
      },
      renderPlayground(opts) {
        const key = opts.key;
        if (state.editors[key] === undefined) state.editors[key] = opts.initial;
        const tabTitle = opts.tabTitle || "index.html";
        return `
          <div class="grid-2">
            <div class="browser-frame">
              <div class="browser-bar flex-between">
                <span class="mono font-bold">index.html</span>
                <div class="flex-row">
                  ${(opts.presets || [])
                    .map(
                      (p, i) =>
                        `<button type="button" class="btn" style="padding:3px 8px;" onclick="DECK_PRESETS['${esc(key)}'][${i}]()">${esc(p.label)}</button>`
                    )
                    .join("")}
                  <button type="button" class="btn" style="padding:3px 8px;" onclick="DECK.resetEditor('${esc(key)}', DECK_INITIALS['${esc(key)}'])">Сброс</button>
                </div>
              </div>
              <textarea class="live-editor" spellcheck="false" oninput="DECK.updateEditor('${esc(key)}', this.value)">${esc(state.editors[key])}</textarea>
            </div>
            <div class="browser-frame">
              <div class="browser-bar">
                <div class="browser-dots">
                  <span style="background:#ef4444;"></span>
                  <span style="background:#f59e0b;"></span>
                  <span style="background:#22c55e;"></span>
                </div>
                <span class="browser-tab">🌐 ${esc(tabTitle)}</span>
                <span class="text-xs text-muted" style="margin-left:auto;">Живой предпросмотр</span>
              </div>
              <iframe class="preview-iframe" style="min-height:${opts.height || 230}px;" data-srcdoc-key="${esc(key)}" sandbox="allow-same-origin allow-scripts"></iframe>
            </div>
          </div>
        `;
      },
    };

    window.DECK = api;
    window.DECK_INITIALS = window.DECK_INITIALS || {};
    window.DECK_PRESETS = window.DECK_PRESETS || {};

    document.getElementById("d-prev").addEventListener("click", () => api.go(state.slide - 1));
    document.getElementById("d-next").addEventListener("click", () => api.go(state.slide + 1));
    document.getElementById("d-notes").addEventListener("click", () => {
      state.showNotes = !state.showNotes;
      renderAll();
    });
    document.getElementById("d-grid").addEventListener("click", () => {
      state.showGrid = !state.showGrid;
      renderAll();
    });
    document.getElementById("d-overview-close").addEventListener("click", () => {
      state.showGrid = false;
      renderAll();
    });
    document.getElementById("d-theme").addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
    });

    document.addEventListener("keydown", (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") api.go(state.slide + 1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") api.go(state.slide - 1);
      else if (e.key.toLowerCase() === "n") {
        state.showNotes = !state.showNotes;
        renderAll();
      } else if (e.key.toLowerCase() === "g") {
        state.showGrid = !state.showGrid;
        renderAll();
      }
    });

    renderAll();
  }

  window.initDeck = initDeck;
})();
