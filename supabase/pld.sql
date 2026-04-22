-- ============================================================
-- FINCO ARCOS — Módulo PLD/FT (Prevención de Lavado de Dinero)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Campos KYC reforzados en clientes ─────────────────────────
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS actividad_economica      text,
  ADD COLUMN IF NOT EXISTS pep_parentesco           text,
  ADD COLUMN IF NOT EXISTS estructura_corporativa   text,
  ADD COLUMN IF NOT EXISTS perfil_monto_promedio    numeric(14,2),
  ADD COLUMN IF NOT EXISTS perfil_frecuencia        text
    CHECK (perfil_frecuencia IN ('Diaria','Semanal','Quincenal','Mensual','Bimestral','Trimestral','Eventual')),
  ADD COLUMN IF NOT EXISTS perfil_forma_pago        text,
  ADD COLUMN IF NOT EXISTS fecha_actualizacion_expediente date;

-- ── Tabla: pld_consultas_listas (bitácora de consultas) ────────
CREATE TABLE IF NOT EXISTS public.pld_consultas_listas (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      uuid REFERENCES public.clientes(id),
  cliente_nombre  text,
  lista           text NOT NULL CHECK (lista IN ('OFAC','ONU','SAT_69B','CNBV')),
  resultado       text NOT NULL CHECK (resultado IN ('Sin coincidencia','Coincidencia encontrada','Error en consulta')),
  observaciones   text,
  consultado_por  uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.pld_consultas_listas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pld_listas_auth" ON public.pld_consultas_listas
  FOR ALL USING (auth.role() = 'authenticated');

-- ── Tabla: pld_alertas (OR / OI / OIP) ────────────────────────
CREATE TABLE IF NOT EXISTS public.pld_alertas (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo             text NOT NULL CHECK (tipo IN ('OR','OI','OIP')),
  estatus          text NOT NULL DEFAULT 'Pendiente'
    CHECK (estatus IN ('Pendiente','En revisión','Resuelta','Escalada')),
  cliente_id       uuid REFERENCES public.clientes(id),
  cliente_nombre   text,
  contrato_numero  text,
  monto            numeric(14,2),
  forma_pago       text,
  descripcion      text NOT NULL,
  origen           text DEFAULT 'manual' CHECK (origen IN ('automatico','manual')),
  resolucion       text,
  fecha_resolucion date,
  atendido_por     uuid REFERENCES auth.users(id),
  creado_por       uuid REFERENCES auth.users(id),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.pld_alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pld_alertas_auth" ON public.pld_alertas
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER pld_alertas_updated_at
  BEFORE UPDATE ON public.pld_alertas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
