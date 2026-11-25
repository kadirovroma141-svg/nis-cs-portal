"use client";
import { useDeferredValue, useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Braces, CopyPlus, Eye, Plus, Table, Trash2 } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ImageUploadButton } from "@/components/teacher/image-upload-button";
import { TableGrid, findMarkdownTable, toMarkdownTable } from "@/components/admin/table-grid";
import { TheoryBlockView } from "@/components/theory/theory-block";
import {
  BLOCK_TYPE_LABELS,
  INTERACTIVE_WIDGETS,
  INTERACTIVE_WIDGET_LABELS,
  emptyBlock,
  theoryBlockSchema,
  type TheoryBlock,
  type TheoryBlockType,
} from "@/lib/theory/blocks";
import { saveTheoryPack, type TheoryInput } from "@/app/(app)/admin/actions";
import { useT } from "@/lib/i18n/client";

type Section = TheoryInput["sections"][number];
type LO = { id: string; code: string; description: string };

const TYPES = Object.keys(BLOCK_TYPE_LABELS) as TheoryBlockType[];

function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Markdown text with an "insert / edit table" helper (tables live inside Markdown). */
function MarkdownField({ label, value, onChange, rows = 5 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const tr = useT();
  const [table, setTable] = useState<{ columns: string[]; rows: string[][]; start: number; end: number } | null>(null);
  const existing = findMarkdownTable(value);
  return (
    <div className="space-y-2">
      <Field label={tr(label)} htmlFor="md">
        <Textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      </Field>
      {table ? (
        <div className="space-y-2 rounded-md border border-dashed border-border p-3">
          <TableGrid columns={table.columns} rows={table.rows} onChange={(columns, r) => setTable({ ...table, columns, rows: r })} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => {
              const md = toMarkdownTable(table.columns, table.rows);
              const next = table.start < 0 ? `${value.trimEnd()}${value.trim() ? "\n\n" : ""}${md}` : value.slice(0, table.start) + md + value.slice(table.end);
              onChange(next);
              setTable(null);
            }}>{tr("Вставить таблицу в текст")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setTable(null)}>{tr("Cancel")}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 text-xs">
          <button type="button" className="inline-flex items-center gap-1 text-muted hover:text-fg"
            onClick={() => setTable({ columns: ["", ""], rows: [["", ""]], start: -1, end: -1 })}>
            <Table className="h-3.5 w-3.5" /> {tr("Добавить таблицу")}
          </button>
          {existing && (
            <button type="button" className="inline-flex items-center gap-1 text-muted hover:text-fg" onClick={() => setTable(existing)}>
              <Table className="h-3.5 w-3.5" /> {tr("Редактировать первую таблицу")}
            </button>
          )}
          <span className="text-muted">{tr("Markdown: **жирный**, *курсив*, `код`, $формула$, «- » — пункт списка")}</span>
        </div>
      )}
    </div>
  );
}

/** Ordered items, each a Markdown textarea (steps / list). */
function ItemsField({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const tr = useT();
  return (
    <div className="space-y-2">
      {items.map((it, k) => (
        <div key={k} className="flex items-start gap-2">
          <span className="mt-2 w-6 text-right text-xs tabular-nums text-muted">{k + 1}.</span>
          <Textarea rows={2} className="flex-1" value={it} aria-label={tr("Пункт {n}", { n: k + 1 })} onChange={(e) => onChange(items.map((x, j) => (j === k ? e.target.value : x)))} />
          <div className="flex flex-col">
            <button type="button" className="text-muted hover:text-fg" aria-label={tr("Move block up")} onClick={() => onChange(move(items, k, -1))}><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" className="text-muted hover:text-fg" aria-label={tr("Move block down")} onClick={() => onChange(move(items, k, 1))}><ArrowDown className="h-3.5 w-3.5" /></button>
            <button type="button" className="text-muted hover:text-danger" aria-label={tr("Удалить пункт {n}", { n: k + 1 })} onClick={() => onChange(items.filter((_, j) => j !== k))}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ))}
      <Button size="sm" variant="secondary" onClick={() => onChange([...items, ""])}><Plus className="h-3.5 w-3.5" /> {tr("Пункт")}</Button>
    </div>
  );
}

/** Source on the left, live rendering on the right (Mermaid, formula, HTML). */
function WithPreview({ children, block }: { children: ReactNode; block: TheoryBlock }) {
  const tr = useT();
  const deferred = useDeferredValue(block);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">{children}</div>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted">{tr("Предпросмотр")}</p>
        <TheoryBlockView block={deferred} />
      </div>
    </div>
  );
}

const numList = (s: string) => s.split(/[\s,;]+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n));

/** Edits one block with type-appropriate fields (or raw JSON). */
function BlockEditor({ block, onChange }: { block: TheoryBlock; onChange: (b: TheoryBlock) => void }) {
  const tr = useT();
  const [raw, setRaw] = useState<string | null>(null);
  const [rawError, setRawError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const set = (patch: Partial<TheoryBlock>) => onChange({ ...block, ...patch } as TheoryBlock);

  if (raw !== null) {
    return (
      <div className="space-y-2">
        <Textarea rows={8} className="font-mono text-xs" value={raw} onChange={(e) => setRaw(e.target.value)} aria-label={tr("Block JSON")} />
        {rawError && <p className="text-xs text-danger">{rawError}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => {
            try {
              const parsed = theoryBlockSchema.parse(JSON.parse(raw));
              onChange(parsed);
              setRaw(null);
              setRawError(null);
            } catch (e) {
              setRawError((e as Error).message.slice(0, 300));
            }
          }}>{tr("Apply JSON")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setRaw(null)}>{tr("Cancel")}</Button>
        </div>
      </div>
    );
  }

  const text = (key: string, label: string, rows = 3, mono = false) => (
    <Field label={tr(label)} htmlFor={key}>
      <Textarea
        rows={rows}
        className={mono ? "font-mono text-xs" : undefined}
        value={String((block as Record<string, unknown>)[key] ?? "")}
        onChange={(e) => set({ [key]: e.target.value } as Partial<TheoryBlock>)}
      />
    </Field>
  );
  const line = (key: string, label: string) => (
    <Field label={tr(label)} htmlFor={key}>
      <Input value={String((block as Record<string, unknown>)[key] ?? "")} onChange={(e) => set({ [key]: e.target.value || undefined } as Partial<TheoryBlock>)} />
    </Field>
  );
  const md = (key: string, label: string, rows = 5) => (
    <MarkdownField label={label} rows={rows} value={String((block as Record<string, unknown>)[key] ?? "")} onChange={(v) => set({ [key]: v } as Partial<TheoryBlock>)} />
  );
  const live = ["diagram", "formula", "html_preview", "interactive"].includes(block.type);

  const body = (() => {
    switch (block.type) {
      case "heading":
        return (
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            {line("text", "Heading")}
            <Field label={tr("Level")} htmlFor="lvl">
              <Select value={String(block.level ?? 2)} onChange={(e) => set({ level: Number(e.target.value) as 2 | 3 })}>
                <option value="2">{tr("Large")}</option><option value="3">{tr("Small")}</option>
              </Select>
            </Field>
          </div>
        );
      case "paragraph":
      case "exam_tip":
      case "warning":
        return md("content", "Content (Markdown)", 6);
      case "definition":
        return <>{line("term", "Term")}{md("content", "Definition (Markdown)", 3)}</>;
      case "example":
        return <>{line("title", "Title")}{md("content", "Content (Markdown)", 5)}</>;
      case "diagram":
        return (
          <WithPreview block={block}>
            <Field label={tr("Format")} htmlFor="fmt">
              <Select value={block.format} onChange={(e) => set({ format: e.target.value as "mermaid" | "ascii" })}>
                <option value="mermaid">{tr("Mermaid")}</option><option value="ascii">{tr("Plain text / ASCII")}</option>
              </Select>
            </Field>
            {block.format === "mermaid" && (
              <Field label={tr("Шаблон")} htmlFor="tpl">
                <Select value="" onChange={(e) => e.target.value && set({ content: MERMAID_TEMPLATES[e.target.value] })}>
                  <option value="">{tr("— выбрать, чтобы заменить текст —")}</option>
                  {Object.keys(MERMAID_TEMPLATES).map((k) => <option key={k} value={k}>{tr(k)}</option>)}
                </Select>
              </Field>
            )}
            {text("content", "Diagram source", 10, true)}
            {line("caption", "Caption")}
          </WithPreview>
        );
      case "image":
        return (
          <>
            {line("url", "Image URL (https:// or /path)")}
            <ImageUploadButton
              folder="theory"
              onInsert={(m) => {
                const r = /^!\[(.*)\]\((.*)\)$/.exec(m);
                if (r) set({ url: r[2], alt: block.alt || r[1] } as Partial<TheoryBlock>);
              }}
            />
            {line("alt", "Alt text (required)")}
            {line("caption", "Caption")}
          </>
        );
      case "code":
        return <>{line("language", "Language")}{text("content", "Code", 8, true)}{line("caption", "Caption")}</>;
      case "formula":
        return <WithPreview block={block}>{text("latex", "LaTeX", 3, true)}{line("caption", "Caption")}</WithPreview>;
      case "steps":
        return <>{line("title", "Title")}<ItemsField items={block.items} onChange={(items) => set({ items })} /></>;
      case "list":
        return (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!block.ordered} onChange={(e) => set({ ordered: e.target.checked || undefined })} /> {tr("Нумерованный список")}
            </label>
            <ItemsField items={block.items} onChange={(items) => set({ items })} />
          </>
        );
      case "comparison":
        return (
          <>
            {line("title", "Title")}
            <TableGrid minColumns={2} columns={block.columns} rows={block.rows} onChange={(columns, rows) => set({ columns, rows })} />
          </>
        );
      case "callout":
        return (
          <>
            <Field label={tr("Colour")} htmlFor="tone">
              <Select value={block.tone} onChange={(e) => set({ tone: e.target.value as "info" | "success" | "warning" | "danger" })}>
                <option value="info">{tr("Blue — note")}</option><option value="success">{tr("Green — key point")}</option>
                <option value="warning">{tr("Amber — caution")}</option><option value="danger">{tr("Red — important")}</option>
              </Select>
            </Field>
            {line("title", "Title")}
            {md("content", "Content (Markdown)", 4)}
          </>
        );
      case "cards":
        return (
          <div className="space-y-3">
            {block.items.map((c, k) => (
              <div key={k} className="grid gap-2 rounded-md border border-border p-3">
                <Input value={c.title} placeholder={tr("Card title")} aria-label={tr("Card {v0} title", { v0: k + 1 })} onChange={(e) => set({ items: block.items.map((x, j) => (j === k ? { ...x, title: e.target.value } : x)) })} />
                <Textarea rows={3} value={c.content} aria-label={tr("Card {v0} content", { v0: k + 1 })} onChange={(e) => set({ items: block.items.map((x, j) => (j === k ? { ...x, content: e.target.value } : x)) })} />
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => set({ items: move(block.items, k, -1) })} aria-label={tr("Move block up")}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => set({ items: move(block.items, k, 1) })} aria-label={tr("Move block down")}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => set({ items: block.items.filter((_, j) => j !== k) })}>{tr("Remove card")}</Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={() => set({ items: [...block.items, { title: "", content: "" }] })}>{tr("Add card")}</Button>
          </div>
        );
      case "html_preview":
        return (
          <WithPreview block={block}>
            {line("title", "Title")}
            {text("html", "HTML", 8, true)}
            {text("css", "CSS", 6, true)}
            <Field label={tr("Height (px)")} htmlFor="h">
              <Input type="number" min={60} max={1200} value={block.height ?? 240} onChange={(e) => set({ height: Number(e.target.value) })} />
            </Field>
          </WithPreview>
        );
      case "interactive": {
        const cfg = block.config ?? {};
        const setCfg = (patch: Record<string, unknown>) => {
          const next = Object.fromEntries(Object.entries({ ...cfg, ...patch }).filter(([, v]) => v !== undefined && v !== ""));
          set({ config: Object.keys(next).length ? next : undefined });
        };
        return (
          <WithPreview block={block}>
            <Field label={tr("Widget")} htmlFor="widget">
              <Select value={block.widget} onChange={(e) => set({ widget: e.target.value as (typeof INTERACTIVE_WIDGETS)[number], config: undefined })}>
                {INTERACTIVE_WIDGETS.map((w) => <option key={w} value={w}>{tr(INTERACTIVE_WIDGET_LABELS[w])}</option>)}
              </Select>
            </Field>
            {line("title", "Title")}
            {block.widget === "twos_complement" && (
              <Field label={tr("Число битов")} htmlFor="bits">
                <Select value={String(cfg.bits ?? 8)} onChange={(e) => setCfg({ bits: Number(e.target.value) })}>
                  {[4, 8, 16].map((b) => <option key={b} value={b}>{b}</option>)}
                </Select>
              </Field>
            )}
            {block.widget === "truth_table" && (
              <Field label={tr("Логическое выражение (необязательно)")} htmlFor="expr">
                <Input value={String(cfg.expression ?? "")} placeholder="A AND (NOT B)" onChange={(e) => setCfg({ expression: e.target.value || undefined })} />
              </Field>
            )}
            {block.widget === "sort_visualizer" && (
              <Field label={tr("Алгоритм")} htmlFor="alg">
                <Select value={String(cfg.algorithm ?? "bubble")} onChange={(e) => setCfg({ algorithm: e.target.value })}>
                  <option value="bubble">{tr("Пузырьковая")}</option><option value="insertion">{tr("Вставками")}</option>
                </Select>
              </Field>
            )}
            {(block.widget === "sort_visualizer" || block.widget === "binary_search") && (
              <Field label={tr("Числа через пробел или запятую (необязательно)")} htmlFor="vals">
                <Input defaultValue={Array.isArray(cfg.values) ? (cfg.values as number[]).join(", ") : ""} onBlur={(e) => { const v = numList(e.target.value); setCfg({ values: v.length >= 2 ? v : undefined }); }} />
              </Field>
            )}
            {block.widget === "binary_search" && (
              <Field label={tr("Искомое число (необязательно)")} htmlFor="target">
                <Input type="number" value={typeof cfg.target === "number" ? cfg.target : ""} onChange={(e) => setCfg({ target: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </Field>
            )}
          </WithPreview>
        );
      }
    }
  })();

  return (
    <div className="space-y-3">
      {body}
      {preview && !live && (
        <div className="rounded-md border border-dashed border-border p-3">
          <TheoryBlockView block={block} />
        </div>
      )}
      <div className="flex flex-wrap gap-4">
        {!live && (
          <button type="button" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg" onClick={() => setPreview((p) => !p)}>
            <Eye className="h-3.5 w-3.5" />{" "}{preview ? tr("Скрыть предпросмотр") : tr("Предпросмотр")}
          </button>
        )}
        <button type="button" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg" onClick={() => setRaw(JSON.stringify(block, null, 2))}>
          <Braces className="h-3.5 w-3.5" />{" "}{tr("Edit as JSON")}
        </button>
      </div>
    </div>
  );
}

const MERMAID_TEMPLATES: Record<string, string> = {
  "Блок-схема алгоритма": 'flowchart TD\n  S(["Начало"]) --> I[/"Ввод a"/]\n  I --> C{"a > 0?"}\n  C -- "да" --> Y["Вывод «положительное»"]\n  C -- "нет" --> N["Вывод «не положительное»"]\n  Y --> E(["Конец"])\n  N --> E',
  "Связи таблиц БД": "erDiagram\n  STUDENT ||--o{ GRADE : has\n  STUDENT {\n    int id PK\n    string name\n  }\n  GRADE {\n    int id PK\n    int student_id FK\n    int mark\n  }",
  "Ментальная карта": "mindmap\n  root((Тема))\n    Понятие 1\n    Понятие 2\n      Пример",
  "Круговая диаграмма": 'pie title Доли\n  "A" : 40\n  "B" : 60',
  "Столбчатая диаграмма": 'xychart-beta\n  title "Заголовок"\n  x-axis ["Янв", "Фев", "Мар"]\n  y-axis "Значение" 0 --> 100\n  bar [30, 50, 80]',
  "Граф / схема устройства": 'flowchart LR\n  A["Устройство ввода"] --> B["Процессор"] --> C["Устройство вывода"]\n  B <--> D["Память"]',
};

export function TheoryEditor({
  topicId,
  initial,
  objectives,
}: {
  topicId: string;
  initial: TheoryInput;
  objectives: LO[];
}) {
  const tr = useT();
  const [pack, setPack] = useState<TheoryInput>(initial);
  const [open, setOpen] = useState<number>(0);
  const [preview, setPreview] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string; message?: string; details?: string[] } | null>(null);
  const [pending, start] = useTransition();

  const setSection = (i: number, patch: Partial<Section>) =>
    setPack((p) => ({ ...p, sections: p.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const setBlocks = (i: number, blocks: TheoryBlock[]) => setSection(i, { blocks });

  const save = (status?: TheoryInput["status"]) =>
    start(async () => {
      const payload = { ...pack, status: status ?? pack.status };
      // drop empty list items authors leave behind
      payload.sections = payload.sections.map((s) => ({
        ...s,
        blocks: s.blocks.map((b) => (b.type === "list" || b.type === "steps" ? { ...b, items: b.items.filter((x) => x.trim()) } : b)) as TheoryBlock[],
      }));
      const r = await saveTheoryPack(topicId, payload);
      setResult(r);
      // new sections get their ids, so the next save updates them instead of re-creating them
      if (r.ok) setPack({ ...payload, sections: payload.sections.map((s, i) => ({ ...s, id: r.sectionIds?.[i] ?? s.id })) });
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <Field label={tr("Theory pack title")} htmlFor="pt"><Input id="pt" value={pack.title} onChange={(e) => setPack({ ...pack, title: e.target.value })} /></Field>
          <Field label={tr("Status")} htmlFor="ps">
            <Select id="ps" value={pack.status} onChange={(e) => setPack({ ...pack, status: e.target.value as TheoryInput["status"] })}>
              <option value="draft">{tr("Draft")}</option><option value="review">{tr("Review")}</option><option value="published">{tr("Published")}</option><option value="archived">{tr("Archived")}</option>
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPreview((p) => !p)}><Eye className="h-4 w-4" /> {preview ? tr("Edit") : tr("Preview")}</Button>
            <Button onClick={() => save()} disabled={pending}>{pending ? tr("Saving…") : tr("Save")}</Button>
            {pack.status !== "published" && <Button variant="success" onClick={() => save("published")} disabled={pending}>{tr("Publish")}</Button>}
          </div>
          <Field label={tr("Summary")} htmlFor="psum" className="sm:col-span-3">
            <Textarea id="psum" rows={2} value={pack.summary ?? ""} onChange={(e) => setPack({ ...pack, summary: e.target.value || null })} />
          </Field>
        </CardBody>
      </Card>
      {result?.error && (
        <Alert tone="danger" title={result.error}>
          {result.details && <ul className="list-disc pl-4 text-xs">{result.details.map((d, i) => <li key={i}>{d}</li>)}</ul>}
        </Alert>
      )}
      {result?.ok && <Alert tone="success">{result.message}</Alert>}

      {pack.sections.map((s, i) => (
        <Card key={s.id ?? `new-${i}`}>
          <CardHeader
            title={<button type="button" className="text-left hover:underline" onClick={() => setOpen(open === i ? -1 : i)}>{i + 1}. {s.title || tr("Untitled section")}</button>}
            description={tr("{length} blocks · {length1} LOs", { length: s.blocks.length, length1: s.objectiveIds.length })}
            action={
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label={tr("Move section up")} onClick={() => setPack({ ...pack, sections: move(pack.sections, i, -1) })}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label={tr("Move section down")} onClick={() => setPack({ ...pack, sections: move(pack.sections, i, 1) })}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label={tr("Delete section")} onClick={() => window.confirm(tr("Delete this section?")) && setPack({ ...pack, sections: pack.sections.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            }
          />
          {open === i && (
            <CardBody className="space-y-5">
              {preview ? (
                <div className="space-y-4">{s.blocks.map((b, j) => <TheoryBlockView key={j} block={b} />)}</div>
              ) : (
                <>
                  <Field label={tr("Section title")} htmlFor={`st${i}`}><Input id={`st${i}`} value={s.title} onChange={(e) => setSection(i, { title: e.target.value })} /></Field>
                  <fieldset>
                    <legend className="mb-1 text-sm font-medium">{tr("Learning objectives covered by this section")}</legend>
                    <div className="flex flex-wrap gap-2">
                      {objectives.map((lo) => {
                        const on = s.objectiveIds.includes(lo.id);
                        return (
                          <button key={lo.id} type="button" title={lo.description} aria-pressed={on}
                            onClick={() => setSection(i, { objectiveIds: on ? s.objectiveIds.filter((x) => x !== lo.id) : [...s.objectiveIds, lo.id] })}
                            className={on ? "rounded-full bg-primary px-2.5 py-0.5 font-mono text-xs text-primary-fg" : "rounded-full border border-border px-2.5 py-0.5 font-mono text-xs"}>
                            {lo.code}
                          </button>
                        );
                      })}
                      {objectives.length === 0 && <p className="text-xs text-muted">{tr("Map learning objectives to the topic first.")}</p>}
                    </div>
                  </fieldset>
                  <ol className="space-y-3">
                    {s.blocks.map((b, j) => (
                      <li key={j} className="rounded-lg border border-border p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Badge tone="primary">{tr(BLOCK_TYPE_LABELS[b.type])}</Badge>
                          <div className="ml-auto flex gap-1">
                            <Button size="sm" variant="ghost" aria-label={tr("Move block up")} onClick={() => setBlocks(i, move(s.blocks, j, -1))}><ArrowUp className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" aria-label={tr("Move block down")} onClick={() => setBlocks(i, move(s.blocks, j, 1))}><ArrowDown className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" aria-label={tr("Дублировать блок")} onClick={() => setBlocks(i, [...s.blocks.slice(0, j + 1), structuredClone(b), ...s.blocks.slice(j + 1)])}><CopyPlus className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" aria-label={tr("Delete block")} onClick={() => window.confirm(tr("Удалить этот блок?")) && setBlocks(i, s.blocks.filter((_, k) => k !== j))}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <BlockEditor block={b} onChange={(nb) => setBlocks(i, s.blocks.map((x, k) => (k === j ? nb : x)))} />
                        <div className="mt-3 flex justify-end">
                          <Select className="h-8 w-auto text-xs" value="" aria-label={tr("Вставить блок ниже")}
                            onChange={(e) => e.target.value && setBlocks(i, [...s.blocks.slice(0, j + 1), emptyBlock(e.target.value as TheoryBlockType), ...s.blocks.slice(j + 1)])}>
                            <option value="">{tr("+ блок ниже…")}</option>
                            {TYPES.map((t) => <option key={t} value={t}>{tr(BLOCK_TYPE_LABELS[t])}</option>)}
                          </Select>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted">{tr("Add block:")}</span>
                    {TYPES.map((t) => (
                      <Button key={t} size="sm" variant="secondary" onClick={() => setBlocks(i, [...s.blocks, emptyBlock(t)])}>{tr(BLOCK_TYPE_LABELS[t])}</Button>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          )}
        </Card>
      ))}
      <Button variant="secondary" onClick={() => {
        setPack({ ...pack, sections: [...pack.sections, { id: null, title: "New section", objectiveIds: [], blocks: [emptyBlock("paragraph")] }] });
        setOpen(pack.sections.length);
      }}><Plus className="h-4 w-4" />{" "}{tr("Add section")}</Button>
    </div>
  );
}
