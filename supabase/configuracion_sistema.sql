-- ============================================================
-- FINCO ARCOS — Configuración del sistema
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
  clave       text PRIMARY KEY,
  valor       text,
  updated_by  uuid REFERENCES auth.users(id),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_auth" ON public.configuracion_sistema
  FOR ALL USING (auth.role() = 'authenticated');

-- Valores por defecto
INSERT INTO public.configuracion_sistema (clave, valor) VALUES
  ('correos_activos',       'false'),
  ('cobranza_frecuencia',   'mensual'),
  ('cobranza_dia',          '1'),
  ('cobranza_asunto',       'Recordatorio de pago — {{numero_contrato}}'),
  ('cobranza_mensaje',      'Estimado {{nombre}}, le recordamos que su pago correspondiente al período {{periodo}} por {{monto}} vence el {{fecha_vencimiento}}. Favor de realizar su pago a la brevedad.')
ON CONFLICT (clave) DO NOTHING;
