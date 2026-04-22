-- ============================================================
-- FINCO ARCOS — Módulo 11: Arrendamiento Puro vs. Financiero
-- ============================================================

-- Diferenciación en contratos de arrendamiento
ALTER TABLE public.contratos_arrendamiento
  ADD COLUMN IF NOT EXISTS tipo_arrendamiento text DEFAULT 'financiero'
    CHECK (tipo_arrendamiento IN ('financiero', 'puro')),
  ADD COLUMN IF NOT EXISTS tipo_renta text DEFAULT 'fija'
    CHECK (tipo_renta IN ('fija', 'variable')),
  ADD COLUMN IF NOT EXISTS indice_ajuste text,         -- INPC, TIIE, UDI, etc.
  ADD COLUMN IF NOT EXISTS frecuencia_ajuste text;     -- anual, semestral, trimestral

-- Tabla base de activos propios (detalle completo en Módulo 14)
-- Se crea ahora para que los contratos puro puedan referenciarlo
CREATE TABLE IF NOT EXISTS public.activos_finco (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_bien           text NOT NULL DEFAULT 'vehiculo'
    CHECK (tipo_bien IN ('vehiculo','maquinaria','equipo','inmueble','otro')),
  descripcion         text NOT NULL,
  marca               text,
  modelo              text,
  anio                int,
  niv                 text,
  placas              text,
  color               text,
  costo_adquisicion   numeric(14,2) NOT NULL,
  fecha_adquisicion   date NOT NULL,
  proveedor           text,
  -- Depreciación
  tasa_deprec_fiscal  numeric(6,4) DEFAULT 0.25,   -- SAT: 25% vehiculos
  tasa_deprec_contable numeric(6,4) DEFAULT 0.20,  -- 20% = vida útil 5 años
  -- Estatus
  estatus             text DEFAULT 'disponible'
    CHECK (estatus IN ('disponible','en_arrendamiento','en_recuperacion','dado_de_baja')),
  notas               text,
  portafolio          text,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE public.activos_finco ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activos_auth" ON public.activos_finco
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TRIGGER activos_updated_at
  BEFORE UPDATE ON public.activos_finco
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FK entre contrato puro y activo (opcional, se llena cuando existe el activo)
ALTER TABLE public.contratos_arrendamiento
  ADD COLUMN IF NOT EXISTS activo_id uuid REFERENCES public.activos_finco(id);
