import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadCSV(data: Record<string, any>[], filename: string) {
  const headers = Object.keys(data[0] || {});
  const csvRows = [headers.join(",")];
  for (const row of data) {
    csvRows.push(headers.map((h) => {
      const v = row[h];
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","));
  }
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadPDF(
  title: string,
  headers: string[],
  rows: string[][],
  filename: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 27);
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 32,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });
  doc.save(`${filename}.pdf`);
}
