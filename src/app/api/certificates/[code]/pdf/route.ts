import { handler } from "@/lib/api";
import { certificatePdf } from "@/lib/pdf";
import { verifyCertificate } from "@/server/services/certificate.service";

type Ctx = { params: Promise<{ code: string }> };

export const GET = handler(async (req: Request, { params }: Ctx) => {
  const cert = await verifyCertificate((await params).code);
  const origin = new URL(req.url).origin;
  const pdf = certificatePdf({ ...cert, verifyUrl: `${origin}/verify/${cert.code}` });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${cert.code}.pdf"`,
    },
  });
});
