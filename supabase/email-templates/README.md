# Correos de autenticación de HomeAssist

Plantillas con la identidad de HomeAssist para los correos que envía Supabase Auth.
Se generan con `node scripts/build-email-templates.mjs` (edita ahí el diseño o los textos).

## Instalarlas

En Supabase: **Authentication → Emails → Templates**. Para cada plantilla, pega el **asunto**
en *Subject* y el contenido completo del archivo `.html` en *Body* (pestaña *Source*), y guarda.

| Plantilla en Supabase | Archivo | Asunto |
|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirma tu cuenta de HomeAssist |
| Reset password | `reset-password.html` | Restablece tu contraseña de HomeAssist |
| Change email address | `change-email.html` | Confirma tu nuevo correo en HomeAssist |
| Magic link | `magic-link.html` | Tu enlace de acceso a HomeAssist |
| Invite user | `invite.html` | Te invitaron a HomeAssist |

`_vista-previa.html` es solo para ver el diseño en el navegador (datos de ejemplo); no se pega en Supabase.

## Requisitos

- **Authentication → URL Configuration → Site URL** debe ser la dirección de la app
  (`http://localhost:3000` en desarrollo). Los enlaces de los correos se arman con ella.
- **Confirm email** activado en **Authentication → Sign In / Providers → Email**.

## Cómo funciona el enlace

Cada correo apunta a `/auth/confirm?token_hash=…&type=…&next=…` dentro de la app
(`app/auth/confirm/route.ts`), que valida el token de un solo uso, abre la sesión y redirige:

- Confirmar cuenta / invitación / acceso → `/dashboard`
- Restablecer contraseña → `/restablecer` (pantalla para escribir la contraseña nueva)
- Cambio de correo → `/perfil`

## Remitente con el nombre "HomeAssist"

El servicio de correo incluido en Supabase es solo para pruebas: envía muy pocos correos por hora,
el remitente aparece como "Supabase Auth" y puede limitarse a direcciones del equipo del proyecto.
Para que el remitente diga **HomeAssist** y llegue a cualquier persona, configura un SMTP propio en
**Project Settings → Authentication → SMTP Settings** (por ejemplo Resend, Brevo o Gmail con
contraseña de aplicación) con *Sender name* = `HomeAssist`.
