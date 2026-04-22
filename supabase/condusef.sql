-- ============================================================
-- FINCO ARCOS — Módulo 12: CONDUSEF simplificado para SAPI
-- ============================================================

-- SACG: Sistema de Atención a Clientes (quejas y aclaraciones)
CREATE TABLE IF NOT EXISTS public.sacg_quejas (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio             text NOT NULL UNIQUE,
  cliente_id        uuid REFERENCES public.clientes(id),
  cliente_nombre    text,
  tipo              text NOT NULL CHECK (tipo IN ('Queja','Aclaración','Consulta','Reclamación')),
  canal             text DEFAULT 'Email' CHECK (canal IN ('Presencial','Telefónico','Email','Portal','Escrito')),
  numero_contrato   text,
  monto_reclamado   numeric(14,2),
  descripcion       text NOT NULL,
  estatus           text NOT NULL DEFAULT 'Recibida'
    CHECK (estatus IN ('Recibida','En proceso','Resuelta','Improcedente')),
  fecha_recepcion   date NOT NULL DEFAULT CURRENT_DATE,
  fecha_limite      date,     -- CONDUSEF: 30 días hábiles ≈ 45 días naturales
  fecha_resolucion  date,
  responsable       uuid REFERENCES auth.users(id),
  resolucion        text,
  creado_por        uuid REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.sacg_quejas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sacg_auth" ON public.sacg_quejas
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER sacg_updated_at
  BEFORE UPDATE ON public.sacg_quejas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
