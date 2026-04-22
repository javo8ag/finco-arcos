-- ============================================================
-- FINCO ARCOS — Módulo 10: Fondeo y Cartera Pasiva
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fondeos (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_fondeador  text NOT NULL,
  tipo              text NOT NULL DEFAULT 'institucional'
    CHECK (tipo IN ('institucional','friends_family','propio','fondo_inversion')),
  monto_total       numeric(14,2) NOT NULL,
  tasa_anual        numeric(8,4) NOT NULL,
  plazo_meses       int NOT NULL,
  fecha_inicio      date NOT NULL,
  fecha_vencimiento date NOT NULL,
  metodo            text NOT NULL DEFAULT 'frances'
    CHECK (metodo IN ('frances','aleman','bullet')),
  moneda            text NOT NULL DEFAULT 'MXN' CHECK (moneda IN ('MXN','USD')),
  estatus           text NOT NULL DEFAULT 'Activo'
    CHECK (estatus IN ('Activo','Vencido','Liquidado','Cancelado')),
  notas             text,
  portafolio        text,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.fondeos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fondeos_auth" ON public.fondeos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER fondeos_updated_at
  BEFORE UPDATE ON public.fondeos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabla de amortización del fondeo (Finco como acreditado)
CREATE TABLE IF NOT EXISTS public.tabla_amortizacion_fondeo (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fondeo_id     uuid NOT NULL REFERENCES public.fondeos(id) ON DELETE CASCADE,
  numero_pago   int NOT NULL,
  fecha_pago    date NOT NULL,
  capital       numeric(14,2) NOT NULL DEFAULT 0,
  interes       numeric(14,2) NOT NULL DEFAULT 0,
  total_pago    numeric(14,2) NOT NULL,
  saldo_insoluto numeric(14,2) NOT NULL,
  estatus_pago  text DEFAULT 'Pendiente'
    CHECK (estatus_pago IN ('Pendiente','Pagado','Parcial','Atrasado')),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.tabla_amortizacion_fondeo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tabla_fondeo_auth" ON public.tabla_amortizacion_fondeo
  FOR ALL USING (auth.role() = 'authenticated');

-- Relación fondeo ↔ contratos colocados
CREATE TABLE IF NOT EXISTS public.fondeo_contratos (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fondeo_id       uuid NOT NULL REFERENCES public.fondeos(id) ON DELETE CASCADE,
  contrato_id     uuid NOT NULL,
  contrato_tipo   text NOT NULL CHECK (contrato_tipo IN ('arrendamiento','credito')),
  monto_asignado  numeric(14,2) NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (fondeo_id, contrato_id, contrato_tipo)
);

ALTER TABLE public.fondeo_contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fondeo_contratos_auth" ON public.fondeo_contratos
  FOR ALL USING (auth.role() = 'authenticated');
