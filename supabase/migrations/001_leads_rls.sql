-- ══════════════════════════════════════════════════════════
--  Corporación Madake — Migración inicial
--  Ejecuta este SQL en Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════

-- ── 1. Extensión para UUIDs ───────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. Tabla principal de leads ───────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT        NOT NULL CHECK (char_length(nombre)   BETWEEN 2 AND 100),
  empresa       TEXT        NOT NULL CHECK (char_length(empresa)  BETWEEN 2 AND 120),
  telefono      TEXT        NOT NULL CHECK (telefono ~ '^[0-9()\-\s\+]{7,20}$'),
  correo        TEXT        NOT NULL CHECK (correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  mensaje       TEXT                 CHECK (char_length(mensaje)  <= 1000),
  ip_address    INET,
  user_agent    TEXT,
  estado        TEXT        NOT NULL DEFAULT 'nuevo'
                            CHECK (estado IN ('nuevo','contactado','cerrado','descartado')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Índices ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_estado_idx     ON public.leads (estado);
CREATE INDEX IF NOT EXISTS leads_correo_idx     ON public.leads (correo);

-- ── 4. Trigger: actualiza updated_at automáticamente ─────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. ROW LEVEL SECURITY (RLS) ───────────────────────────
--  Regla principal: el cliente anónimo SOLO puede insertar.
--  Nunca puede leer, modificar ni borrar registros.
--  Solo el rol service_role (backend/admin) tiene acceso completo.

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Política: cualquier visitante puede crear un lead (INSERT)
CREATE POLICY "leads_insert_anon"
  ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política: usuarios autenticados con rol 'admin' pueden leer todos los leads
CREATE POLICY "leads_select_admin"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role')) = 'admin'
  );

-- Política: usuarios autenticados con rol 'admin' pueden actualizar estado
CREATE POLICY "leads_update_admin"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role')) = 'admin'
  )
  WITH CHECK (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role')) = 'admin'
  );

-- Política: solo service_role puede borrar (nunca el cliente)
-- (service_role bypasses RLS por defecto en Supabase — no necesita política explícita)

-- ── 6. Vista segura para el panel admin ──────────────────
--  Oculta ip_address y user_agent del frontend
CREATE OR REPLACE VIEW public.leads_admin_view AS
  SELECT
    id, nombre, empresa, telefono, correo,
    mensaje, estado, created_at, updated_at
  FROM public.leads
  ORDER BY created_at DESC;

-- Acceso a la vista solo para authenticated
GRANT SELECT ON public.leads_admin_view TO authenticated;

-- ── 7. Función segura para rate limiting básico ───────────
--  Bloquea más de 3 leads del mismo correo en 1 hora
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_correo TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.leads
  WHERE correo = p_correo
    AND created_at > NOW() - INTERVAL '1 hour';

  RETURN v_count < 3;
END;
$$;
