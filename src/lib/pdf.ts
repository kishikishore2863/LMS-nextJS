import "server-only";

/**
 * Dependency-free certificate PDF (single landscape A4 page, Helvetica, WinAnsi).
 * Kept tiny on purpose; swap for React-PDF in the worker if richer layouts are needed.
 */
type CertInput = { learner: string; course: string; issuedAt: Date | string; code: string; durationMin: number; verifyUrl: string };

const W = 842;
const H = 595;

function esc(s: string) {
  return s
    .replace(/[^\x20-\xFF]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/** Approximate Helvetica width (0.5em avg, 0.55 for bold) to centre lines. */
function centred(text: string, size: number, y: number, bold = false, color = "0.12 0.14 0.2") {
  const width = text.length * size * (bold ? 0.56 : 0.46);
  const x = Math.max(40, (W - width) / 2);
  return `${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${y} Td (${esc(text)}) Tj ET`;
}

export function certificatePdf(c: CertInput): Buffer {
  const issued = new Date(c.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const hours = c.durationMin >= 60 ? `${Math.round(c.durationMin / 6) / 10} hours` : `${c.durationMin} minutes`;
  const content = [
    // Border + accent bar
    "0.27 0.33 0.85 RG 6 w 24 24 794 547 re S",
    "0.85 0.87 0.95 RG 1 w 36 36 770 523 re S",
    "0.27 0.33 0.85 rg 36 520 770 39 re f",
    centred("CERTIFICATE OF COMPLETION", 18, 534, true, "1 1 1"),
    centred("This certifies that", 16, 440, false, "0.35 0.38 0.45"),
    centred(c.learner, 40, 385, true),
    centred("has successfully completed the course", 16, 335, false, "0.35 0.38 0.45"),
    centred(c.course, 28, 285, true, "0.27 0.33 0.85"),
    centred(`Issued ${issued}  |  ${hours} of learning`, 13, 230, false, "0.35 0.38 0.45"),
    centred(`Certificate ID: ${c.code}`, 12, 110, true, "0.2 0.22 0.3"),
    centred(`Verify at ${c.verifyUrl}`, 10, 90, false, "0.45 0.48 0.55"),
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
