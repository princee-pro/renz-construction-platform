import "server-only";

import PDFDocument from "pdfkit";

/**
 * RENZ business-document engine (D1.5 §60–§71). One A4 layout family for
 * invoices (draft / issued / void), payment receipts and purchase orders:
 * header with mark, document identity and state; meta grid; parties; a
 * line table that repeats its header across pages; totals that never split
 * from their heading; free-text sections; a footer with page X / Y.
 * Financial figures arrive pre-formatted from each domain adapter — the
 * engine never computes money.
 */

export type DocumentTone = "gold" | "danger" | "muted" | "ok";

export type DocumentParty = Readonly<{
  label: string;
  name: string;
  lines: readonly string[];
}>;

export type DocumentMeta = Readonly<{ label: string; value: string }>;

export type DocumentLine = Readonly<{
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  total: string;
}>;

export type DocumentTotal = Readonly<{
  label: string;
  value: string;
  emphasis?: "strong" | "final";
}>;

export type DocumentSection =
  | Readonly<{ heading: string; body: string }>
  | Readonly<{ heading: string; rows: readonly (readonly string[])[] }>;

export type BusinessDocumentModel = Readonly<{
  /** Document family label, e.g. "Invoice", "Purchase order", "Payment receipt". */
  kind: string;
  /** Official number when one exists; otherwise the fallback is printed. */
  number: string | null;
  numberFallback: string;
  state: Readonly<{ label: string; tone: DocumentTone }>;
  /** Large diagonal state mark on every page (DRAFT / VOID). */
  stamp?: string | null;
  /** One-line notice under the header (e.g. void explanation). */
  banner?: Readonly<{ text: string; tone: DocumentTone }> | null;
  issuer: Readonly<{ name: string; lines: readonly string[] }>;
  parties: readonly DocumentParty[];
  meta: readonly DocumentMeta[];
  lineColumns?: Readonly<{ quantity: string; unit: string; unitPrice: string; total: string }>;
  lines: readonly DocumentLine[];
  totals: readonly DocumentTotal[];
  sections: readonly DocumentSection[];
  footer: string;
  title: string;
  author: string;
}>;

const NAVY = "#071523";
const INK = "#27383f";
const MUTED = "#5c6a6f";
const RULE = "#cbd2cd";
const RULE_SOFT = "#e6e3db";
const GOLD = "#765824";
const GOLD_LIGHT = "#c69a3a";
const DANGER = "#923838";
const OK = "#276746";
const PAPER_TINT = "#f6f4ee";

const PAGE = { width: 595.28, height: 841.89, margin: 46 } as const;
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const COLUMNS = { description: 233, qty: 52, unit: 60, price: 78, total: 80 } as const;
const FOOTER_SPACE = 34;

function toneColor(tone: DocumentTone): string {
  return tone === "danger" ? DANGER : tone === "ok" ? OK : tone === "muted" ? MUTED : GOLD;
}

export async function renderBusinessDocument(model: BusinessDocumentModel): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    bufferPages: true,
    margins: {
      top: PAGE.margin,
      bottom: PAGE.margin + FOOTER_SPACE,
      left: PAGE.margin,
      right: PAGE.margin,
    },
    info: { Title: model.title, Author: model.author, Subject: model.kind },
    pdfVersion: "1.7",
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const bottomLimit = PAGE.height - PAGE.margin - FOOTER_SPACE;

  const stamp = () => {
    if (!model.stamp) return;
    doc
      .save()
      .translate(PAGE.width / 2, PAGE.height / 2)
      .rotate(-28)
      .font("Helvetica-Bold")
      .fontSize(96)
      .fillColor(model.state.tone === "danger" ? DANGER : NAVY)
      .fillOpacity(0.1)
      .text(model.stamp, -300, -48, { width: 600, align: "center", lineBreak: false })
      .restore();
  };
  doc.on("pageAdded", stamp);
  stamp();

  const label = (text: string, x: number, top: number, width: number, align?: "right") =>
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(MUTED)
      .text(text.toUpperCase(), x, top, {
        width,
        characterSpacing: 1.1,
        lineBreak: false,
        ...(align ? { align } : {}),
      });

  // --- Header ---------------------------------------------------------
  const top = PAGE.margin;
  doc.rect(PAGE.margin, top, 30, 30).fill(NAVY);
  doc.rect(PAGE.margin, top + 17, 30, 1.6).fill(GOLD_LIGHT);
  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor("#ffffff")
    .text("R", PAGE.margin, top + 7, { width: 30, align: "center", lineBreak: false });
  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor(NAVY)
    .text(model.issuer.name, PAGE.margin + 40, top + 1, { width: 270, lineBreak: false });
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
  let issuerY = top + 16;
  for (const line of model.issuer.lines.slice(0, 3)) {
    doc.text(line, PAGE.margin + 40, issuerY, { width: 270, lineBreak: false });
    issuerY += 11;
  }

  const rightX = PAGE.width - PAGE.margin - 220;
  doc.font("Helvetica").fontSize(8).fillColor(GOLD).text(model.kind.toUpperCase(), rightX, top, {
    width: 220,
    align: "right",
    characterSpacing: 2,
    lineBreak: false,
  });
  doc
    .font("Helvetica-Bold")
    .fontSize(model.number ? 18 : 13)
    .fillColor(NAVY)
    .text(model.number ?? model.numberFallback, rightX, top + 13, {
      width: 220,
      align: "right",
      lineBreak: false,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(toneColor(model.state.tone))
    .text(model.state.label.toUpperCase(), rightX, top + 36, {
      width: 220,
      align: "right",
      characterSpacing: 1.2,
      lineBreak: false,
    });

  let y = Math.max(issuerY, top + 50) + 8;
  doc
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.width - PAGE.margin, y)
    .lineWidth(1.2)
    .strokeColor(NAVY)
    .stroke();
  y += 10;

  if (model.banner) {
    const color = toneColor(model.banner.tone);
    doc
      .rect(PAGE.margin, y, CONTENT_WIDTH, 20)
      .fill(model.banner.tone === "danger" ? "#f6e9e9" : PAPER_TINT);
    doc.rect(PAGE.margin, y, 3, 20).fill(color);
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(color)
      .text(model.banner.text, PAGE.margin + 10, y + 6, {
        width: CONTENT_WIDTH - 20,
        lineBreak: false,
      });
    y += 28;
  }

  // --- Meta strip -----------------------------------------------------
  if (model.meta.length > 0) {
    const cell = CONTENT_WIDTH / Math.min(model.meta.length, 5);
    let metaX = PAGE.margin;
    let metaBottom = y + 30;
    for (const entry of model.meta.slice(0, 5)) {
      label(entry.label, metaX, y, cell - 6);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK);
      doc.text(entry.value, metaX, y + 10, { width: cell - 10 });
      metaBottom = Math.max(metaBottom, doc.y + 8);
      metaX += cell;
    }
    y = metaBottom;
    doc
      .moveTo(PAGE.margin, y)
      .lineTo(PAGE.width - PAGE.margin, y)
      .lineWidth(0.5)
      .strokeColor(RULE)
      .stroke();
    y += 12;
  }

  // --- Parties --------------------------------------------------------
  if (model.parties.length > 0) {
    const cell = CONTENT_WIDTH / model.parties.length;
    let partyBottom = y;
    model.parties.forEach((party, index) => {
      const px = PAGE.margin + cell * index + (index > 0 ? 10 : 0);
      const width = cell - 12;
      label(party.label, px, y, width);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(INK)
        .text(party.name, px, y + 11, { width });
      doc.font("Helvetica").fontSize(9).fillColor(INK);
      for (const line of party.lines) doc.text(line, { width });
      partyBottom = Math.max(partyBottom, doc.y);
    });
    y = partyBottom + 14;
  }

  // --- Line table -----------------------------------------------------
  const columns = model.lineColumns ?? {
    quantity: "Qty",
    unit: "Unit",
    unitPrice: "Unit price",
    total: "Amount",
  };
  const x = {
    description: PAGE.margin,
    qty: PAGE.margin + COLUMNS.description,
    unit: PAGE.margin + COLUMNS.description + COLUMNS.qty,
    price: PAGE.margin + COLUMNS.description + COLUMNS.qty + COLUMNS.unit,
    total: PAGE.margin + COLUMNS.description + COLUMNS.qty + COLUMNS.unit + COLUMNS.price,
  };
  const tableHeader = (at: number): number => {
    doc
      .moveTo(PAGE.margin, at)
      .lineTo(PAGE.width - PAGE.margin, at)
      .lineWidth(1)
      .strokeColor(NAVY)
      .stroke();
    doc.font("Helvetica-Bold").fontSize(7).fillColor(GOLD);
    const textY = at + 6;
    const opts = { characterSpacing: 1, lineBreak: false } as const;
    doc.text("DESCRIPTION", x.description, textY, { width: COLUMNS.description - 8, ...opts });
    doc.text(columns.quantity.toUpperCase(), x.qty, textY, {
      width: COLUMNS.qty - 4,
      align: "right",
      ...opts,
    });
    doc.text(columns.unit.toUpperCase(), x.unit + 8, textY, { width: COLUMNS.unit - 8, ...opts });
    doc.text(columns.unitPrice.toUpperCase(), x.price, textY, {
      width: COLUMNS.price - 4,
      align: "right",
      ...opts,
    });
    doc.text(columns.total.toUpperCase(), x.total, textY, {
      width: COLUMNS.total,
      align: "right",
      ...opts,
    });
    const after = at + 19;
    doc
      .moveTo(PAGE.margin, after)
      .lineTo(PAGE.width - PAGE.margin, after)
      .lineWidth(0.5)
      .strokeColor(RULE)
      .stroke();
    return after;
  };
  if (model.lines.length > 0) {
    y = tableHeader(y);
    doc.font("Helvetica").fontSize(9).fillColor(INK);
    model.lines.forEach((line, index) => {
      const descriptionHeight = doc.heightOfString(line.description, {
        width: COLUMNS.description - 8,
      });
      const rowHeight = Math.max(descriptionHeight, 11) + 10;
      if (y + rowHeight > bottomLimit) {
        doc.addPage();
        y = tableHeader(PAGE.margin);
        doc.font("Helvetica").fontSize(9).fillColor(INK);
      }
      if (index % 2 === 1) doc.rect(PAGE.margin, y, CONTENT_WIDTH, rowHeight).fill(PAPER_TINT);
      doc.fillColor(INK);
      doc.text(line.description, x.description, y + 5, { width: COLUMNS.description - 8 });
      doc.text(line.quantity, x.qty, y + 5, {
        width: COLUMNS.qty - 4,
        align: "right",
        lineBreak: false,
      });
      doc.text(line.unit, x.unit + 8, y + 5, { width: COLUMNS.unit - 8, lineBreak: false });
      doc.text(line.unitPrice, x.price, y + 5, {
        width: COLUMNS.price - 4,
        align: "right",
        lineBreak: false,
      });
      doc.text(line.total, x.total, y + 5, {
        width: COLUMNS.total,
        align: "right",
        lineBreak: false,
      });
      y += rowHeight;
      doc
        .moveTo(PAGE.margin, y)
        .lineTo(PAGE.width - PAGE.margin, y)
        .lineWidth(0.4)
        .strokeColor(RULE_SOFT)
        .stroke();
    });
  }

  // --- Totals ---------------------------------------------------------
  if (model.totals.length > 0) {
    const totalsHeight = model.totals.length * 18 + 20;
    if (y + totalsHeight > bottomLimit) {
      doc.addPage();
      y = PAGE.margin;
    }
    y += 10;
    const totalsX = PAGE.width - PAGE.margin - 240;
    for (const total of model.totals) {
      const strong = total.emphasis === "strong" || total.emphasis === "final";
      if (total.emphasis === "final") {
        doc.rect(totalsX, y - 4, 240, 20).fill(NAVY);
      } else if (strong) {
        doc.rect(totalsX, y - 4, 240, 20).fill(PAPER_TINT);
      }
      doc
        .font(strong ? "Helvetica-Bold" : "Helvetica")
        .fontSize(strong ? 10 : 9)
        .fillColor(total.emphasis === "final" ? "#ffffff" : strong ? NAVY : INK);
      doc.text(total.label, totalsX + 8, y, { width: 120, lineBreak: false });
      doc.text(total.value, totalsX + 120, y, { width: 112, align: "right", lineBreak: false });
      y += 18;
    }
  }

  // --- Sections -------------------------------------------------------
  for (const section of model.sections) {
    if ("rows" in section) {
      const needed = 28 + section.rows.length * 14;
      if (y + needed > bottomLimit) {
        doc.addPage();
        y = PAGE.margin;
      }
      y += 14;
      doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text(section.heading, PAGE.margin, y);
      y += 14;
      doc.font("Helvetica").fontSize(9).fillColor(INK);
      for (const row of section.rows) {
        const cell = CONTENT_WIDTH / row.length;
        row.forEach((value, index) => {
          const last = index === row.length - 1;
          doc.text(value, PAGE.margin + cell * index, y, {
            width: cell - 6,
            lineBreak: false,
            ...(last && row.length > 1 ? { align: "right" as const } : {}),
          });
        });
        y += 14;
      }
      continue;
    }
    doc.font("Helvetica").fontSize(9);
    const needed = 28 + doc.heightOfString(section.body, { width: CONTENT_WIDTH });
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = PAGE.margin;
    }
    y += 14;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY).text(section.heading, PAGE.margin, y);
    y += 13;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(INK)
      .text(section.body, PAGE.margin, y, { width: CONTENT_WIDTH });
    y = doc.y;
  }

  // --- Footer with page X / Y (buffered pages) --------------------------
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const footerY = PAGE.height - PAGE.margin - 10;
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .save()
      .moveTo(PAGE.margin, footerY - 8)
      .lineTo(PAGE.width - PAGE.margin, footerY - 8)
      .lineWidth(0.5)
      .strokeColor(RULE)
      .stroke()
      .rect(PAGE.margin, footerY - 8, 28, 1.2)
      .fill(GOLD_LIGHT)
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(model.footer, PAGE.margin, footerY, { width: CONTENT_WIDTH - 120, lineBreak: false })
      .text(
        `${model.number ?? model.numberFallback} · Page ${index - range.start + 1} / ${range.count}`,
        PAGE.width - PAGE.margin - 200,
        footerY,
        { width: 200, align: "right", lineBreak: false },
      )
      .restore();
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
  return finished;
}
