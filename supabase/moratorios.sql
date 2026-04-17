-- ============================================================
-- MORATORIOS AUTOMÁTICOS — Finco Arcos
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Función principal: actualiza estatus de contratos y pagos
-- Se llama desde el frontend cada vez que se abre cobranza/dashboard
CREATE OR REPLACE FUNCTION public.sincronizar_moratorios()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  arr_en_mora   int := 0;
  crd_en_mora   int := 0;
  pagos_atrasados int := 0;
BEGIN

  -- 1. Marcar pagos de arrendamiento como Atrasado
  UPDATE public.tabla_amortizacion ta
  SET estatus_pago = 'Atrasado'
  FROM public.contratos_arrendamiento ca
  WHERE ta.contrato_id   = ca.id
    AND ta.contrato_tipo = 'arrendamiento'
    AND ta.estatus_pago  = 'Pendiente'
    AND ta.fecha_pago    < (CURRENT_DATE - ca.dias_gracia * INTERVAL '1 day');

  GET DIAGNOSTICS pagos_atrasados = ROW_COUNT;

  -- 2. Marcar contratos arrendamiento en mora
  --    (al menos un pago con estatus Atrasado)
  UPDATE public.contratos_arrendamiento
  SET estatus = 'En mora'
  WHERE estatus = 'Activo'
    AND id IN (
      SELECT DISTINCT contrato_id
      FROM public.tabla_amortizacion
      WHERE contrato_tipo = 'arrendamiento'
        AND estatus_pago  = 'Atrasado'
    );

  GET DIAGNOSTICS arr_en_mora = ROW_COUNT;

  -- 3. Regresar a Activo si todos sus pagos atrasados ya se pagaron
  UPDATE public.contratos_arrendamiento
  SET estatus = 'Activo'
  WHERE estatus = 'En mora'
    AND id NOT IN (
      SELECT DISTINCT contrato_id
      FROM public.tabla_amortizacion
      WHERE contrato_tipo = 'arrendamiento'
        AND estatus_pago  = 'Atrasado'
    );

  -- 4. Marcar pagos de crédito como Atrasado
  UPDATE public.tabla_amortizacion ta
  SET estatus_pago = 'Atrasado'
  FROM public.contratos_credito cc
  WHERE ta.contrato_id   = cc.id
    AND ta.contrato_tipo = 'credito'
    AND ta.estatus_pago  = 'Pendiente'
    AND ta.fecha_pago    < (CURRENT_DATE - cc.dias_gracia * INTERVAL '1 day');

  -- 5. Marcar créditos en mora
  UPDATE public.contratos_credito
  SET estatus = 'En mora'
  WHERE estatus = 'Activo'
    AND id IN (
      SELECT DISTINCT contrato_id
      FROM public.tabla_amortizacion
      WHERE contrato_tipo = 'credito'
        AND estatus_pago  = 'Atrasado'
    );

  GET DIAGNOSTICS crd_en_mora = ROW_COUNT;

  -- 6. Regresar créditos a Activo si ya están al corriente
  UPDATE public.contratos_credito
  SET estatus = 'Activo'
  WHERE estatus = 'En mora'
    AND id NOT IN (
      SELECT DISTINCT contrato_id
      FROM public.tabla_amortizacion
      WHERE contrato_tipo = 'credito'
        AND estatus_pago  = 'Atrasado'
    );

  RETURN jsonb_build_object(
    'pagos_atrasados',   pagos_atrasados,
    'arr_en_mora',       arr_en_mora,
    'crd_en_mora',       crd_en_mora,
    'sincronizado_en',   now()
  );
END;
$$;

-- Permisos: cualquier usuario autenticado puede llamar la función
GRANT EXECUTE ON FUNCTION public.sincronizar_moratorios() TO authenticated;


-- ── Vista: moratorios activos por contrato ─────────────────────
-- Calcula el moratorio acumulado de todos los pagos atrasados
CREATE OR REPLACE VIEW public.moratorios_activos AS
SELECT
  ta.contrato_id,
  ta.contrato_tipo,
  COUNT(*)                                              AS pagos_atrasados,
  SUM(ta.total_pago)                                    AS monto_vencido,
  MIN(ta.fecha_pago)                                    AS primer_vencimiento,
  MAX(CURRENT_DATE - ta.fecha_pago)                     AS max_dias_atraso,
  -- Moratorio estimado (tasa de cada contrato)
  SUM(
    CASE ta.contrato_tipo
      WHEN 'arrendamiento' THEN
        ROUND(
          (ta.capital + ta.interes_ordinario)
          * (ca.tasa_moratoria / 100.0 / 365.0)
          * GREATEST(0, CURRENT_DATE - ta.fecha_pago - ca.dias_gracia)
        , 2)
      WHEN 'credito' THEN
        ROUND(
          (ta.capital + ta.interes_ordinario)
          * (cc.tasa_moratoria / 100.0 / 365.0)
          * GREATEST(0, CURRENT_DATE - ta.fecha_pago - cc.dias_gracia)
        , 2)
      ELSE 0
    END
  )                                                     AS moratorio_estimado,
  SUM(
    CASE ta.contrato_tipo
      WHEN 'arrendamiento' THEN
        ROUND(
          (ta.capital + ta.interes_ordinario)
          * (ca.tasa_moratoria / 100.0 / 365.0)
          * GREATEST(0, CURRENT_DATE - ta.fecha_pago - ca.dias_gracia)
          * 1.16
        , 2)
      WHEN 'credito' THEN
        ROUND(
          (ta.capital + ta.interes_ordinario)
          * (cc.tasa_moratoria / 100.0 / 365.0)
          * GREATEST(0, CURRENT_DATE - ta.fecha_pago - cc.dias_gracia)
          * 1.16
        , 2)
      ELSE 0
    END
  )                                                     AS moratorio_con_iva
FROM public.tabla_amortizacion ta
LEFT JOIN public.contratos_arrendamiento ca
       ON ca.id = ta.contrato_id AND ta.contrato_tipo = 'arrendamiento'
LEFT JOIN public.contratos_credito cc
       ON cc.id = ta.contrato_id AND ta.contrato_tipo = 'credito'
WHERE ta.estatus_pago IN ('Atrasado', 'Pendiente')
  AND ta.fecha_pago < CURRENT_DATE
GROUP BY ta.contrato_id, ta.contrato_tipo;

-- Permisos de la vista
GRANT SELECT ON public.moratorios_activos TO authenticated;
