// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────
//  Inicializa el cliente de Supabase usando variables de entorno.
//  Las variables NEXT_PUBLIC_* son seguras de exponer al navegador.
//  La SERVICE_ROLE_KEY NUNCA debe usarse aquí (solo en el servidor).
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.warn('[Madake] Faltan variables de entorno de Supabase.');
}

// Cliente público (anon) — solo puede INSERT en leads gracias a RLS
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: false,   // La página de captura no necesita sesión
    autoRefreshToken: false,
  },
});

// ─────────────────────────────────────────────────────────────
//  Cliente admin (solo para uso en API routes del servidor)
//  NUNCA importar este cliente en componentes del navegador.
// ─────────────────────────────────────────────────────────────
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error(
      '[Madake] SUPABASE_SERVICE_ROLE_KEY no está definida.\n' +
      'Este cliente solo puede usarse en rutas del servidor (API routes).'
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
