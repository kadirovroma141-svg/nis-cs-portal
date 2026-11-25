"use client";
// Тренажёры для тем без «программной» практики (ТБ, устройство ПК, носители…).
// Всё содержимое приходит из config блока теории (JSON темы), код только показывает и проверяет.
import { useMemo, useRef, useState, type MouseEvent } from "react";
import { useT } from "@/lib/i18n/client";

const box = "rounded-lg border border-border bg-surface p-4";
const btn = "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:border-primary disabled:opacity-50";
const btnPrimary = "rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg hover:opacity-90 disabled:opacity-50";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

// Детерминированное перемешивание (одинаково на сервере и в браузере — без ошибок гидратации).
function shuffled<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Score({ ok, total }: { ok: number; total: number }) {
  const t = useT();
  const full = ok === total;
  return (
    <p className={`text-sm font-semibold ${full ? "text-success" : "text-warning"}`}>
      {t("Верно:")} {ok} / {total}
      {full ? ` — ${t("отлично!")}` : ""}
    </p>
  );
}

// ───────────────────────── Разложи по группам ─────────────────────────
// config: { instruction?, categories: string[], cards: [{ text, category, explain? }] }
// category — название группы или её номер (с 0).
export function CardSort({ config }: { config?: Record<string, unknown> }) {
  const t = useT();
  const categories = arr(config?.categories).map(str).filter(Boolean);
  const cards = useMemo(() => {
    const list = arr(config?.cards)
      .map(obj)
      .map((c) => {
        const cat = c.category;
        const idx = typeof cat === "number" ? cat : categories.indexOf(str(cat));
        return { text: str(c.text), cat: idx, explain: str(c.explain) };
      })
      .filter((c) => c.text && c.cat >= 0 && c.cat < categories.length);
    return shuffled(list, list.map((c) => c.text).join("|"));
  }, [config, categories]);
  const [pick, setPick] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  if (categories.length < 2 || cards.length === 0) return <p className="text-sm text-danger">{t("Тренажёр не настроен.")}</p>;
  const done = Object.keys(pick).length === cards.length;
  const ok = cards.filter((c, i) => pick[i] === c.cat).length;
  return (
    <div className={`${box} space-y-3`}>
      <p className="text-sm">{str(config?.instruction) || t("Для каждой карточки выберите группу, затем нажмите «Проверить».")}</p>
      <ul className="space-y-2">
        {cards.map((c, i) => {
          const right = checked && pick[i] === c.cat;
          const wrong = checked && pick[i] !== c.cat;
          return (
            <li
              key={i}
              className={`rounded-md border p-2 ${right ? "border-success bg-success-soft" : wrong ? "border-danger bg-danger-soft" : "border-border bg-surface-2"}`}
            >
              <p className="text-sm font-medium">{c.text}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {categories.map((name, k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={checked}
                    onClick={() => setPick((p) => ({ ...p, [i]: k }))}
                    className={`rounded-full border px-2.5 py-0.5 text-xs ${
                      pick[i] === k ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface hover:border-primary"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {wrong && (
                <p className="mt-1.5 text-xs">
                  <span className="font-semibold">{t("Правильно:")}</span> {categories[c.cat]}
                  {c.explain ? ` — ${c.explain}` : ""}
                </p>
              )}
              {right && c.explain && <p className="mt-1.5 text-xs text-muted">{c.explain}</p>}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        {!checked ? (
          <button type="button" className={btnPrimary} disabled={!done} onClick={() => setChecked(true)}>
            {done ? t("Проверить") : `${t("Осталось карточек:")} ${cards.length - Object.keys(pick).length}`}
          </button>
        ) : (
          <>
            <Score ok={ok} total={cards.length} />
            <button
              type="button"
              className={btn}
              onClick={() => {
                setPick({});
                setChecked(false);
              }}
            >
              {t("Ещё раз")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Выбери решение ─────────────────────────
// config: { scenarios: [{ situation, options: [{ text, correct, explain? }] }] }
export function ScenarioChoice({ config }: { config?: Record<string, unknown> }) {
  const t = useT();
  const scenarios = useMemo(
    () =>
      arr(config?.scenarios)
        .map(obj)
        .map((s) => ({
          situation: str(s.situation),
          options: shuffled(
            arr(s.options)
              .map(obj)
              .map((o) => ({ text: str(o.text), correct: o.correct === true, explain: str(o.explain) }))
              .filter((o) => o.text),
            str(s.situation),
          ),
        }))
        .filter((s) => s.situation && s.options.some((o) => o.correct)),
    [config],
  );
  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  if (scenarios.length === 0) return <p className="text-sm text-danger">{t("Тренажёр не настроен.")}</p>;
  if (step >= scenarios.length)
    return (
      <div className={`${box} space-y-3`}>
        <Score ok={score} total={scenarios.length} />
        <button
          type="button"
          className={btn}
          onClick={() => {
            setStep(0);
            setChosen(null);
            setScore(0);
          }}
        >
          {t("Пройти ещё раз")}
        </button>
      </div>
    );
  const s = scenarios[step];
  return (
    <div className={`${box} space-y-3`}>
      <p className="text-xs font-semibold text-muted">
        {t("Ситуация")} {step + 1} / {scenarios.length}
      </p>
      <p className="font-medium">{s.situation}</p>
      <div className="grid gap-2">
        {s.options.map((o, i) => {
          const show = chosen !== null;
          const cls = !show
            ? "border-border bg-surface-2 hover:border-primary"
            : o.correct
              ? "border-success bg-success-soft"
              : i === chosen
                ? "border-danger bg-danger-soft"
                : "border-border bg-surface-2 opacity-70";
          return (
            <button
              key={i}
              type="button"
              disabled={show}
              onClick={() => {
                setChosen(i);
                if (o.correct) setScore((x) => x + 1);
              }}
              className={`rounded-md border p-2 text-left text-sm ${cls}`}
            >
              <span className="font-medium">{o.text}</span>
              {show && (o.correct || i === chosen) && o.explain && <span className="mt-1 block text-xs text-muted">{o.explain}</span>}
            </button>
          );
        })}
      </div>
      {chosen !== null && (
        <div className="flex items-center gap-3">
          <p className={`text-sm font-semibold ${s.options[chosen].correct ? "text-success" : "text-danger"}`}>
            {s.options[chosen].correct ? t("Верно!") : t("Неверно — правильный ответ выделен зелёным.")}
          </p>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setStep((x) => x + 1);
              setChosen(null);
            }}
          >
            {step + 1 < scenarios.length ? t("Дальше") : t("Итог")}
          </button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Найди на рисунке ─────────────────────────
// config: { image, width, height, mode: "spot" | "find", instruction?,
//           hotspots: [{ x, y, w, h, label, explain? }] }
// spot — найти все нарушения (кликом по рисунку); find — найти по очереди названный объект.
type Spot = { x: number; y: number; w: number; h: number; label: string; explain: string };

export function HotspotScene({ config }: { config?: Record<string, unknown> }) {
  const t = useT();
  const image = str(config?.image);
  const W = num(config?.width) || 800;
  const H = num(config?.height) || 500;
  const mode = config?.mode === "find" ? "find" : "spot";
  const spots: Spot[] = useMemo(
    () =>
      arr(config?.hotspots)
        .map(obj)
        .map((s) => ({ x: num(s.x), y: num(s.y), w: num(s.w), h: num(s.h), label: str(s.label), explain: str(s.explain) }))
        .filter((s) => s.w > 0 && s.h > 0 && s.label),
    [config],
  );
  const order = useMemo(() => shuffled(spots.map((_, i) => i), image + spots.length), [spots, image]);
  const [found, setFound] = useState<number[]>([]);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [misses, setMisses] = useState(0);
  const [reveal, setReveal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  if (!image || spots.length === 0) return <p className="text-sm text-danger">{t("Тренажёр не настроен.")}</p>;

  const target = mode === "find" ? order.find((i) => !found.includes(i)) : undefined;
  const finished = found.length === spots.length;

  function click(e: MouseEvent<HTMLDivElement>) {
    if (finished || reveal || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    const hit = spots.findIndex((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    if (mode === "spot") {
      if (hit < 0) {
        setMisses((m) => m + 1);
        setMsg({ tone: "bad", text: t("Здесь нарушения нет — ищите дальше.") });
      } else if (found.includes(hit)) {
        setMsg({ tone: "ok", text: `${t("Уже найдено:")} ${spots[hit].label}` });
      } else {
        setFound((f) => [...f, hit]);
        setMsg({ tone: "ok", text: `${spots[hit].label}${spots[hit].explain ? ` — ${spots[hit].explain}` : ""}` });
      }
      return;
    }
    if (target === undefined) return;
    if (hit === target) {
      setFound((f) => [...f, hit]);
      setMsg({ tone: "ok", text: `${t("Верно:")} ${spots[hit].label}${spots[hit].explain ? ` — ${spots[hit].explain}` : ""}` });
    } else {
      setMisses((m) => m + 1);
      setMsg({ tone: "bad", text: hit >= 0 ? `${t("Это")} ${spots[hit].label}. ${t("Попробуйте ещё раз.")}` : t("Мимо — попробуйте ещё раз.") });
    }
  }

  const shown = reveal ? spots.map((_, i) => i) : found;
  return (
    <div className={`${box} space-y-3`}>
      <p className="text-sm">
        {mode === "find" && target !== undefined && !reveal ? (
          <>
            {t("Нажмите на рисунке:")} <strong>{spots[target].label}</strong>
          </>
        ) : (
          str(config?.instruction) || t("Найдите на рисунке все нарушения и нажмите на каждое.")
        )}
      </p>
      <div
        ref={ref}
        onClick={click}
        className="relative w-full cursor-crosshair overflow-hidden rounded-md border border-border select-none bg-surface"
        style={{ aspectRatio: `${W} / ${H}` }}
        role="application"
        aria-label={t("Интерактивный рисунок")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="pointer-events-none absolute inset-0 h-full w-full" draggable={false} />
        {shown.map((i) => {
          const s = spots[i];
          return (
            <div
              key={i}
              className={`pointer-events-none absolute rounded-md border-[3px] ${found.includes(i) ? "border-success" : "border-warning border-dashed"}`}
              style={{ left: `${(s.x / W) * 100}%`, top: `${(s.y / H) * 100}%`, width: `${(s.w / W) * 100}%`, height: `${(s.h / H) * 100}%` }}
            >
              <span className="absolute -top-2.5 -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-[11px] font-bold text-success-fg">
                {mode === "spot" ? shown.indexOf(i) + 1 : "✓"}
              </span>
            </div>
          );
        })}
      </div>
      {msg && <p className={`text-sm ${msg.tone === "ok" ? "text-success" : "text-danger"}`}>{msg.text}</p>}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold">
          {t("Найдено:")} {found.length} / {spots.length}
        </span>
        <span className="text-muted">
          {t("Промахов:")} {misses}
        </span>
        {!finished && !reveal && (
          <button type="button" className={btn} onClick={() => setReveal(true)}>
            {t("Показать ответы")}
          </button>
        )}
        {(finished || reveal) && (
          <button
            type="button"
            className={btn}
            onClick={() => {
              setFound([]);
              setMisses(0);
              setMsg(null);
              setReveal(false);
            }}
          >
            {t("Ещё раз")}
          </button>
        )}
      </div>
      {(finished || reveal) && mode === "spot" && (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {shown.map((i) => (
            <li key={i}>
              <strong>{spots[i].label}</strong>
              {spots[i].explain ? ` — ${spots[i].explain}` : ""}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
