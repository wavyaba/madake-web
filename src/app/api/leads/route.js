// src/app/api/leads/route.js
// ─────────────────────────────────────────────────────────────
//  POST /api/leads
//  Recibe el formulario de contacto, valida, guarda en Supabase
//  y envía notificación por correo via Resend.
//
//  Este archivo corre SOLO en el servidor (Next.js App Router).
//  Las credenciales nunca llegan al navegador.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { validateLeadForm } from '@/lib/validation';
import { createAdminClient } from '@/lib/supabase';
import { Resend } from 'resend';

// ── Helpers de respuesta ─────────────────────────────────────

function ok(data, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function err(message, status = 400, details = null) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

// ── Cabeceras de seguridad ───────────────────────────────────

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// ── Rate limiting en memoria (simple, suficiente para MVP) ───
//  Para producción de alta escala, usa Upstash Redis.

const rateLimitMap = new Map();
const RATE_LIMIT_MAX      = 3;    // máx solicitudes
const RATE_LIMIT_WINDOW   = 60 * 60 * 1000; // 1 hora en ms

function isRateLimited(identifier) {
  const now = Date.now();
  const record = rateLimitMap.get(identifier) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };

  // Resetear ventana si expiró
  if (now > record.resetAt) {
    record.count   = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW;
  }

  record.count++;
  rateLimitMap.set(identifier, record);

  return record.count > RATE_LIMIT_MAX;
}

// Limpiar entradas viejas del mapa cada hora
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, RATE_LIMIT_WINDOW);

// ── Handler principal ────────────────────────────────────────

export async function POST(request) {
  try {
    // 1. Verificar Content-Type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return err('Content-Type debe ser application/json.', 415);
    }

    // 2. Parsear body de forma segura
    let body;
    try {
      body = await request.json();
    } catch {
      return err('El cuerpo de la solicitud no es JSON válido.', 400);
    }

    // 3. Rate limiting por IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';

    if (isRateLimited(ip)) {
      return err('Demasiadas solicitudes. Intente de nuevo en una hora.', 429);
    }

    // 4. Validar y sanitizar
    const { valid, errors, sanitized } = validateLeadForm(body);
    if (!valid) {
      return err('Los datos del formulario no son válidos.', 422, errors);
    }

const supabase = createAdminClient();

    // 5. Verificar rate limit en base de datos (función SQL creada en migración)
    const { data: allowed, error: rateError } = await supabase
      .rpc('check_rate_limit', { p_correo: sanitized.correo });

    if (rateError) {
      console.error('[Madake] Error en check_rate_limit:', rateError);
      // No bloqueamos al usuario si falla la verificación — registramos y seguimos
    } else if (!allowed) {
      return err('Ya recibimos varias solicitudes de este correo. Intenta más tarde.', 429);
    }

    // 6. Insertar en Supabase (Supabase usa consultas parametrizadas internamente
    //    — no hay concatenación de strings, por lo que SQL injection es imposible)
    const { data: lead, error: insertError } = await supabase
      .from('leads')
      .insert([{
        nombre:     sanitized.nombre,
        empresa:    sanitized.empresa,
        telefono:   sanitized.telefono,
        correo:     sanitized.correo,
        mensaje:    sanitized.mensaje,
        ip_address: ip === 'unknown' ? null : ip,
        user_agent: request.headers.get('user-agent')?.substring(0, 200) || null,
      }])
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('[Madake] Error al insertar lead:', insertError);
      return err('No se pudo guardar la solicitud. Intente de nuevo.', 500);
    }

    // 7. Enviar notificación por correo (no bloqueante — si falla, el lead ya está guardado)
    try {
      await sendNotificationEmail(sanitized, lead.id);
    } catch (mailError) {
      console.error('[Madake] Error al enviar correo de notificación:', mailError);
      // No retornamos error al usuario — el lead ya fue guardado exitosamente
    }

    return ok(
      { message: 'Su solicitud fue recibida. Lo contactaremos pronto.', id: lead.id },
      201
    );

  } catch (unexpectedError) {
    console.error('[Madake] Error inesperado en /api/leads:', unexpectedError);
    return err('Error interno del servidor.', 500);
  }
}

// ── Notificación por correo ──────────────────────────────────

async function sendNotificationEmail(lead, leadId) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFICATION_EMAIL;

  if (!apiKey || !toEmail) {
    console.warn('[Madake] RESEND_API_KEY o NOTIFICATION_EMAIL no configurados. Omitiendo correo.');
    return;
  }

  const resend = new Resend(apiKey);
  const fecha = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });

  await resend.emails.send({
    from:    'Madake Leads <noreply@corporacionmadake.com.mx>',
    to:      toEmail,
    subject: `[Madake] Nuevo lead: ${lead.nombre} — ${lead.empresa}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0D1B2A;">
        <div style="background: #0D1B2A; padding: 20px 28px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #F0B429; font-size: 20px; margin: 0; letter-spacing: 0.05em;">
            CORPORACIÓN MADAKE
          </h1>
          <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 4px 0 0;">
            Nuevo lead recibido desde el sitio web
          </p>
        </div>
        <div style="background: #F5F6F8; padding: 28px; border-radius: 0 0 8px 8px; border: 1px solid #D4DAE4; border-top: none;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #6B7A8D; width: 130px;">Nombre</td>
                <td style="padding: 8px 0; font-weight: 600;">${escapeHtml(lead.nombre)}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7A8D;">Empresa</td>
                <td style="padding: 8px 0;">${escapeHtml(lead.empresa)}</td></tr>
            <tr><td style="padding: 8px 0; color: #6B7A8D;">Teléfono</td>
                <td style="padding: 8px 0;">
                  <a href="tel:${escapeHtml(lead.telefono)}" style="color: #185FA5;">${escapeHtml(lead.telefono)}</a>
                </td></tr>
            <tr><td style="padding: 8px 0; color: #6B7A8D;">Correo</td>
                <td style="padding: 8px 0;">
                  <a href="mailto:${escapeHtml(lead.correo)}" style="color: #185FA5;">${escapeHtml(lead.correo)}</a>
                </td></tr>
            ${lead.mensaje ? `
            <tr><td style="padding: 8px 0; color: #6B7A8D; vertical-align: top;">Mensaje</td>
                <td style="padding: 8px 0; white-space: pre-wrap;">${escapeHtml(lead.mensaje)}</td></tr>
            ` : ''}
          </table>
          <hr style="border: none; border-top: 1px solid #D4DAE4; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6B7A8D; margin: 0;">
            Recibido el ${fecha} · ID: ${leadId}
          </p>
        </div>
      </div>
    `,
  });
}

// Escape HTML para el correo (previene XSS en el cuerpo del email)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Solo aceptar POST
export async function GET() {
  return err('Método no permitido.', 405);
}
