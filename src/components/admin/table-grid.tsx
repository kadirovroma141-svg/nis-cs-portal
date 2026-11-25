"use client";
import { Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

/** Spreadsheet-like editor for a header row + body rows (comparison blocks, Markdown tables). */
export function TableGrid({
  columns,
  rows,
  onChange,
  minColumns = 1,
}: {
  columns: string[];
  rows: string[][];
  onChange: (columns: string[], rows: string[][]) => void;
  minColumns?: number;
}) {
  const t = useT();
  const width = columns.length;
  const fit = (r: string[]) => Array.from({ length: width }, (_, i) => r[i] ?? "");
  const body = rows.map(fit);
  const cell = "w-full min-w-[8rem] rounded border border-border bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="align-bottom">
                  <div className="flex items-center gap-1">
                    <input className={`${cell} font-semibold`} value={c} aria-label={t("Заголовок столбца {n}", { n: i + 1 })}
                      onChange={(e) => onChange(columns.map((x, j) => (j === i ? e.target.value : x)), body)} />
                    {width > minColumns && (
                      <button type="button" className="text-muted hover:text-danger" aria-label={t("Удалить столбец {n}", { n: i + 1 })}
                        onClick={() => onChange(columns.filter((_, j) => j !== i), body.map((r) => r.filter((_, j) => j !== i)))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {body.map((r, ri) => (
              <tr key={ri}>
                {r.map((v, ci) => (
                  <td key={ci}>
                    <textarea rows={1} className={`${cell} resize-y`} value={v} aria-label={t("Строка {r}, столбец {c}", { r: ri + 1, c: ci + 1 })}
                      onChange={(e) => onChange(columns, body.map((x, j) => (j === ri ? x.map((y, k) => (k === ci ? e.target.value : y)) : x)))} />
                  </td>
                ))}
                <td>
                  {body.length > 1 && (
                    <button type="button" className="text-muted hover:text-danger" aria-label={t("Удалить строку {n}", { n: ri + 1 })}
                      onClick={() => onChange(columns, body.filter((_, j) => j !== ri))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => onChange(columns, [...body, Array(width).fill("")])}><Plus className="h-3.5 w-3.5" /> {t("Строка")}</Button>
        <Button size="sm" variant="secondary" disabled={width >= 10} onClick={() => onChange([...columns, ""], body.map((r) => [...r, ""]))}><Plus className="h-3.5 w-3.5" /> {t("Столбец")}</Button>
      </div>
    </div>
  );
}

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

/** Header + rows → a GitHub-flavoured Markdown table. */
export function toMarkdownTable(columns: string[], rows: string[][]): string {
  const line = (r: string[]) => `| ${r.map(esc).join(" | ")} |`;
  return [line(columns), `| ${columns.map(() => "---").join(" | ")} |`, ...rows.map((r) => line(columns.map((_, i) => r[i] ?? "")))].join("\n");
}

/** The first Markdown table in `md`, with its position, or null. */
export function findMarkdownTable(md: string): { start: number; end: number; columns: string[]; rows: string[][] } | null {
  const lines = md.split("\n");
  const split = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].trim().startsWith("|") || !/^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) continue;
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith("|")) j++;
    const before = lines.slice(0, i).join("\n").length + (i ? 1 : 0);
    const length = lines.slice(i, j).join("\n").length;
    return { start: before, end: before + length, columns: split(lines[i]), rows: lines.slice(i + 2, j).map(split) };
  }
  return null;
}
