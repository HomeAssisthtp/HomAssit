#!/usr/bin/env node
/**
 * Genera las plantillas de correo de Supabase Auth con la identidad de HomeAssist.
 *
 *   node scripts/build-email-templates.mjs
 *
 * Salida: supabase/email-templates/*.html  (se pegan en
 * Supabase → Authentication → Emails → Templates).
 *
 * HTML para clientes de correo: tablas, estilos en línea y colores sólidos
 * (Gmail/Outlook no soportan blur, SVG ni CSS moderno).
 * Variables de Supabase: {{ .SiteURL }}, {{ .TokenHash }}, {{ .Email }}, {{ .NewEmail }}.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "email-templates");

const C = {
  bg: "#060a13",
  card: "#0d1626",
  cardEdge: "#1f2c42",
  panel: "#111d31",
  ink: "#e8eef8",
  muted: "#9aa8bf",
  subtle: "#66758e",
  accent: "#4fd1e8",
  accentDark: "#22b8d6",
  onAccent: "#04121a",
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** El enlace pasa por /auth/confirm de la app, que valida el token y abre la sesión. */
const link = (type, next) => `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=${type}&next=${next}`;

function layout({ preheader, eyebrow, title, body, cta, url, note }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <!-- Marca -->
        <tr>
          <td style="padding:0 4px 24px 4px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="40" height="40" align="center" valign="middle" style="width:40px;height:40px;background:#0f2a3a;border:1px solid #2a6f85;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.5px;color:${C.accent};font-family:${FONT};">HA</td>
                <td style="padding-left:12px;font-size:20px;font-weight:600;letter-spacing:-0.3px;color:${C.ink};font-family:${FONT};">Home<span style="color:${C.accent};">Assist</span></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Tarjeta -->
        <tr>
          <td style="background:${C.card};border:1px solid ${C.cardEdge};border-radius:20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td height="4" style="height:4px;line-height:4px;font-size:0;background:${C.accent};background:linear-gradient(90deg,${C.accent},#5b8cff);border-radius:20px 20px 0 0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:36px 36px 8px 36px;">
                  <p style="margin:0 0 10px 0;font-size:11px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:${C.accent};font-family:${FONT};">${eyebrow}</p>
                  <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-0.4px;color:${C.ink};font-family:${FONT};">${title}</h1>
                  ${body.map((p) => `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:${C.muted};font-family:${FONT};">${p}</p>`).join("\n                  ")}
                </td>
              </tr>
              <tr>
                <td style="padding:14px 36px 8px 36px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="${C.accent}" style="background:${C.accent};border-radius:12px;">
                        <a href="${url}" target="_blank" style="display:inline-block;padding:15px 30px;font-size:15px;font-weight:700;color:${C.onAccent};text-decoration:none;border-radius:12px;border:1px solid ${C.accentDark};font-family:${FONT};">${cta}</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:22px 36px 0 36px;">
                  <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:${C.subtle};font-family:${FONT};">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                  <p style="margin:0;padding:12px 14px;background:${C.panel};border:1px solid ${C.cardEdge};border-radius:10px;font-size:12px;line-height:1.5;word-break:break-all;font-family:Consolas,Menlo,monospace;"><a href="${url}" target="_blank" style="color:${C.accent};text-decoration:none;">${url}</a></p>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 36px 34px 36px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr><td style="border-top:1px solid ${C.cardEdge};padding-top:20px;font-size:13px;line-height:1.6;color:${C.subtle};font-family:${FONT};">${note}</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td align="center" style="padding:26px 12px 0 12px;">
            <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:${C.muted};font-family:${FONT};">HomeAssist</p>
            <p style="margin:0 0 10px 0;font-size:12px;line-height:1.6;color:${C.subtle};font-family:${FONT};">Asistencia, monitoreo y seguridad para el hogar.</p>
            <p style="margin:0;font-size:11px;line-height:1.6;color:${C.subtle};font-family:${FONT};">Este es un mensaje automático enviado a {{ .Email }}. No respondas a este correo.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

const NOT_YOU = "Si no fuiste tú, puedes ignorar este mensaje con tranquilidad: no se realizará ningún cambio.";
const EXPIRES = "Por seguridad, este enlace es de un solo uso y caduca en poco tiempo.";

const templates = {
  "confirm-signup": {
    subject: "Confirma tu cuenta de HomeAssist",
    html: layout({
      preheader: "Confirma tu correo para activar tu cuenta y empezar a monitorear tu hogar.",
      eyebrow: "Bienvenido",
      title: "Confirma tu correo electrónico",
      body: [
        "Gracias por crear tu cuenta en <strong style=\"color:#e8eef8;\">HomeAssist</strong>. Solo falta un paso: confirma que esta dirección de correo es tuya para activar tu acceso.",
        "Después podrás registrar tu dispositivo, configurar tus sensores y consultar el estado de tu hogar desde cualquier lugar.",
      ],
      cta: "Confirmar mi cuenta",
      url: link("email", "/dashboard"),
      note: `${EXPIRES} ${NOT_YOU}`,
    }),
  },
  "reset-password": {
    subject: "Restablece tu contraseña de HomeAssist",
    html: layout({
      preheader: "Recibimos una solicitud para restablecer la contraseña de tu cuenta.",
      eyebrow: "Seguridad de la cuenta",
      title: "Restablece tu contraseña",
      body: [
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta de HomeAssist.",
        "Presiona el botón para elegir una contraseña nueva. Tu contraseña actual seguirá funcionando hasta que la cambies.",
      ],
      cta: "Elegir nueva contraseña",
      url: link("recovery", "/restablecer"),
      note: `${EXPIRES} Si no solicitaste este cambio, ignora este mensaje y tu contraseña no se modificará.`,
    }),
  },
  "change-email": {
    subject: "Confirma tu nuevo correo en HomeAssist",
    html: layout({
      preheader: "Confirma el cambio de correo electrónico de tu cuenta.",
      eyebrow: "Cambio de correo",
      title: "Confirma tu nuevo correo",
      body: [
        "Solicitaste cambiar el correo de tu cuenta de HomeAssist a <strong style=\"color:#e8eef8;\">{{ .NewEmail }}</strong>.",
        "Confirma el cambio para que este sea el correo con el que inicias sesión y donde recibes los avisos de tu cuenta.",
      ],
      cta: "Confirmar nuevo correo",
      url: link("email_change", "/perfil"),
      note: `${EXPIRES} Si no solicitaste este cambio, ignora este mensaje y revisa la seguridad de tu cuenta.`,
    }),
  },
  "magic-link": {
    subject: "Tu enlace de acceso a HomeAssist",
    html: layout({
      preheader: "Usa este enlace para entrar a tu cuenta sin escribir tu contraseña.",
      eyebrow: "Acceso seguro",
      title: "Inicia sesión en HomeAssist",
      body: ["Usa este enlace para entrar a tu cuenta sin escribir tu contraseña."],
      cta: "Entrar a HomeAssist",
      url: link("magiclink", "/dashboard"),
      note: `${EXPIRES} ${NOT_YOU}`,
    }),
  },
  invite: {
    subject: "Te invitaron a HomeAssist",
    html: layout({
      preheader: "Una persona de confianza te dio acceso para consultar el estado de su hogar.",
      eyebrow: "Invitación",
      title: "Te invitaron a HomeAssist",
      body: [
        "Una persona de confianza te agregó como <strong style=\"color:#e8eef8;\">contacto autorizado</strong> para que puedas consultar el estado de su hogar y enterarte si ocurre algo que requiera atención.",
        "Acepta la invitación para activar tu acceso.",
      ],
      cta: "Aceptar invitación",
      url: link("invite", "/dashboard"),
      note: `${EXPIRES} Si no esperabas esta invitación, puedes ignorar este mensaje.`,
    }),
  },
};

mkdirSync(OUT, { recursive: true });
for (const [name, t] of Object.entries(templates)) {
  writeFileSync(join(OUT, `${name}.html`), t.html, "utf8");
  console.log(`${name}.html  ·  Asunto: ${t.subject}`);
}

// Vista previa local: mismas plantillas con datos de ejemplo en lugar de las variables.
const sample = (html) =>
  html
    .replaceAll("{{ .SiteURL }}", "http://localhost:3000")
    .replaceAll("{{ .TokenHash }}", "pkce_3f9a1c7e5b2d4086a1f0c9e7d3b5a2f4")
    .replaceAll("{{ .NewEmail }}", "nuevo@correo.com")
    .replaceAll("{{ .Email }}", "ana@correo.com");
writeFileSync(join(OUT, "_vista-previa.html"), sample(templates["confirm-signup"].html), "utf8");
