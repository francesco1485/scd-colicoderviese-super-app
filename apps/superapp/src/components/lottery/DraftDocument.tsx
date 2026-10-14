/**
 * Draft document (regolamento, verbale): preview, copy, download as Markdown, print. Never sent anywhere by the app.
 * The preview HTML is produced from our own Markdown after escaping every character of user text.
 */
import { Copy, Download, Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { btnSecondary } from "./ui";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[da completare: ([^\]]+)\]/g,
      '<mark class="lot-gap">[da completare: $1]</mark>',
    );
}

/** Minimal Markdown → HTML for our own drafts: headings, paragraphs, lists, tables, bold. */
export function draftToHtml(md: string): string {
  const out: string[] = [];
  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h3>${inline(line.slice(3))}</h3>`);
      i++;
    } else if (line.startsWith("# ")) {
      out.push(`<h2>${inline(line.slice(2))}</h2>`);
      i++;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) {
        const cells = lines[i]!.split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        `<table><thead><tr>${(head ?? []).map((c) => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead><tbody>${body
          .map(
            (r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`,
          )
          .join("")}</tbody></table>`,
      );
    } else if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i]!))
        items.push(`<li>${inline(lines[i++]!.slice(2))}</li>`);
      out.push(`<ul>${items.join("")}</ul>`);
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i]!))
        items.push(`<li>${inline(lines[i++]!.replace(/^\d+\. /, ""))}</li>`);
      out.push(`<ol>${items.join("")}</ol>`);
    } else {
      out.push(`<p>${inline(line)}</p>`);
      i++;
    }
  }
  return out.join("\n");
}

const PRINT_CSS =
  "body{font:15px/1.5 system-ui,sans-serif;color:#0b1e3a;max-width:760px;margin:32px auto;padding:0 16px}h2{font-size:22px}h3{font-size:17px;margin-top:22px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #9fb3cc;padding:6px 8px;text-align:left}mark{background:#fff3c4}";

export function DraftDocument({
  markdown,
  fileName,
  title,
  testId,
}: {
  markdown: string;
  fileName: string;
  title: string;
  testId?: string;
}) {
  const html = useMemo(() => draftToHtml(markdown), [markdown]);
  const [copied, setCopied] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnSecondary}
          onClick={() => {
            void navigator.clipboard
              ?.writeText(markdown)
              .then(() => setCopied("Testo copiato."))
              .catch(() => setCopied("Copia non riuscita: usa Scarica."));
          }}
        >
          <Copy className="size-4" aria-hidden="true" /> Copia testo
        </button>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          <Download className="size-4" aria-hidden="true" /> Scarica (.md)
        </button>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => {
            const w = window.open("", "_blank");
            if (!w)
              return setCopied("Il browser ha bloccato la finestra di stampa.");
            w.document.write(
              `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${html}</body></html>`,
            );
            w.document.close();
            w.focus();
            w.print();
          }}
        >
          <Printer className="size-4" aria-hidden="true" /> Stampa
        </button>
        <span
          role="status"
          aria-live="polite"
          className="self-center text-[14px] font-semibold text-[var(--in-sub)]"
        >
          {copied}
        </span>
      </div>
      <article
        className="lot-draft max-h-[640px] overflow-auto rounded-xl border border-[var(--in-line)] bg-white px-4 py-3 text-[15px] leading-relaxed sm:px-6 [&_h2]:mt-1 [&_h2]:text-[21px] [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-[16.5px] [&_h3]:font-bold [&_li]:my-0.5 [&_mark]:rounded [&_mark]:bg-[#fff1bf] [&_mark]:px-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--in-line)] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[var(--in-line)] [&_th]:bg-[#f2f7fd] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-6"
        aria-label={title}
        // Safe: draftToHtml escapes every character of the Markdown before adding our own tags.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
