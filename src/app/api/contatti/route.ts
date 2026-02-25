// src/app/api/contatti/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Campi mancanti." }, { status: 400 });
    }

    const host = process.env.BREVO_SMTP_HOST!;
    const port = Number(process.env.BREVO_SMTP_PORT || 587);
    const user = process.env.BREVO_SMTP_USER!;
    const pass = process.env.BREVO_SMTP_PASS!;
    const to = process.env.CONTACT_TO_EMAIL!;
    const from = process.env.CONTACT_FROM_EMAIL || user;

    if (!host || !user || !pass || !to) {
      return NextResponse.json(
        { error: "Configurazione SMTP incompleta (env)." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
      requireTLS: true,
    });

    // IMPORTANTISSIMO:
    // - FROM deve essere accettato da Brevo (meglio usare `user` se Outlook crea problemi)
    // - Reply-To = email dell’utente (così rispondi direttamente a lui)
    const info = await transporter.sendMail({
      from: `Little Club James <${from}>`,
      to,
      replyTo: email,
      subject: `Nuovo contatto dal sito — ${name}`,
      text: `Nome: ${name}\nEmail: ${email}\n\nMessaggio:\n${message}`,
      html: `
        <div style="font-family:system-ui,Segoe UI,Arial">
          <h2>Nuovo contatto dal sito</h2>
          <p><b>Nome:</b> ${escapeHtml(name)}</p>
          <p><b>Email:</b> ${escapeHtml(email)}</p>
          <p><b>Messaggio:</b></p>
          <pre style="white-space:pre-wrap">${escapeHtml(message)}</pre>
        </div>
      `,
    });

    // Log utile in dev: vedrai in terminale se è partito davvero
    console.log("Brevo sendMail OK:", info.messageId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Brevo sendMail ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Errore invio email" },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}