// CSV with UTF-8 BOM so Excel and Sheets both open correctly
export function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.join(",");
  const body = rows.map(r => columns.map(c => escape(r[c])).join(",")).join("\r\n");
  return "\uFEFF" + header + "\r\n" + body + "\r\n";
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[], columns: string[]) {
  const blob = new Blob([toCSV(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
