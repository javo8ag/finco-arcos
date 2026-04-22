-- ============================================================
-- FINCO ARCOS — Historial de pagos importados
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Campos adicionales en tabla_amortizacion para registrar
-- la fecha real de pago y moratorios calculados por período
ALTER TABLE public.tabla_amortizacion
  ADD COLUMN IF NOT EXISTS fecha_pago_real    date,
  ADD COLUMN IF NOT EXISTS moratorio_dias     int           DEFAULT 0,
  ADD COLUMN IF NOT EXISTS moratorio_cobrado  numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_moratorio      numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monto_pagado       numeric(14,2) DEFAULT 0;
