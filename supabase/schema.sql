-- ============================================================
-- FINCO ARCOS — Esquema base de datos Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: perfiles (extiende auth.users de Supabase)
-- ============================================================
create table if not exists public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null,
  rol         text not null default 'analista'
                check (rol in ('super_admin','admin_fo','analista','cobrador','lectura')),
  portafolio  text,   -- null = ve todos (super_admin), o nombre del family office
  activo      boolean not null default true,
  created_at  timestamptz default now()
);

-- RLS: cada usuario solo ve su propio perfil (super_admin ve todos vía función)
alter table public.perfiles enable row level security;
create policy "perfil_propio" on public.perfiles
  for select using (auth.uid() = id);
create policy "super_admin_ve_todo" on public.perfiles
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'super_admin')
  );

-- ============================================================
-- TABLA: clientes
-- ============================================================
create table if not exists public.clientes (
  id                  uuid primary key default uuid_generate_v4(),
  tipo_persona        text not null check (tipo_persona in ('PFAE','PM')),
  rfc                 text not null unique,
  curp                text,                       -- solo PFAE
  razon_social        text not null,              -- nombre completo o razón social
  nombre_comercial    text,
  representante_legal text,
  telefono            text,
  email               text,
  direccion_fiscal    text,
  clasificacion_riesgo text default 'B'
                        check (clasificacion_riesgo in ('A','B','C','D')),
  limite_credito      numeric(14,2) default 0,
  pep_flag            boolean default false,      -- Persona Políticamente Expuesta
  origen_recursos     text,                       -- AML
  portafolio          text,                       -- family office
  notas               text,
  activo              boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.clientes enable row level security;
create policy "clientes_autenticados" on public.clientes
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- TABLA: contratos_arrendamiento
-- ============================================================
create table if not exists public.contratos_arrendamiento (
  id                  uuid primary key default uuid_generate_v4(),
  numero_contrato     text not null unique,
  cliente_id          uuid not null references public.clientes(id),
  portafolio          text,
  -- Bien arrendado
  marca               text,
  modelo              text,
  anio                int,
  niv                 text,
  placas              text,
  valor_activo        numeric(14,2) not null,
  -- Condiciones financieras
  enganche            numeric(14,2) default 0,
  plazo_meses         int not null,
  tasa_ordinaria      numeric(8,4) not null,     -- porcentaje anual
  tasa_moratoria      numeric(8,4) not null,     -- porcentaje anual
  dias_gracia         int default 0,
  renta_mensual       numeric(14,2),
  valor_residual      numeric(14,2) default 0,
  -- Cargos adicionales
  gps_mensual         numeric(10,2) default 0,
  seguro_mensual      numeric(10,2) default 0,
  gastos_admin        numeric(10,2) default 0,
  cargo_seguridad     numeric(10,2) default 0,
  -- Fechas
  fecha_inicio        date not null,
  fecha_vencimiento   date,
  -- Control
  estatus             text default 'Activo'
                        check (estatus in ('Activo','En mora','Vencido','Liquidado','Cancelado')),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  created_by          uuid references auth.users(id)
);

alter table public.contratos_arrendamiento enable row level security;
create policy "contratos_arr_auth" on public.contratos_arrendamiento
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- TABLA: contratos_credito
-- ============================================================
create table if not exists public.contratos_credito (
  id                  uuid primary key default uuid_generate_v4(),
  numero_contrato     text not null unique,
  cliente_id          uuid not null references public.clientes(id),
  portafolio          text,
  proposito           text default 'Capital de trabajo',
  monto_credito       numeric(14,2) not null,
  enganche            numeric(14,2) default 0,
  plazo_meses         int not null,
  tasa_ordinaria      numeric(8,4) not null,
  tasa_moratoria      numeric(8,4) not null,
  dias_gracia         int default 0,
  metodo_amortizacion text default 'frances'
                        check (metodo_amortizacion in ('frances','aleman')),
  fecha_inicio        date not null,
  fecha_vencimiento   date,
  estatus             text default 'Activo'
                        check (estatus in ('Activo','En mora','Vencido','Liquidado','Cancelado')),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  created_by          uuid references auth.users(id)
);

alter table public.contratos_credito enable row level security;
create policy "contratos_cred_auth" on public.contratos_credito
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- TABLA: tabla_amortizacion
-- ============================================================
create table if not exists public.tabla_amortizacion (
  id                  uuid primary key default uuid_generate_v4(),
  contrato_tipo       text not null check (contrato_tipo in ('arrendamiento','credito')),
  contrato_id         uuid not null,
  numero_pago         int not null,
  fecha_pago          date not null,
  capital             numeric(14,2) not null,
  interes_ordinario   numeric(14,2) not null,
  iva_interes         numeric(14,2) not null,    -- 16%
  cargos_adicionales  numeric(14,2) default 0,
  total_pago          numeric(14,2) not null,
  saldo_insoluto      numeric(14,2) not null,
  estatus_pago        text default 'Pendiente'
                        check (estatus_pago in ('Pendiente','Pagado','Parcial','Atrasado')),
  created_at          timestamptz default now()
);

alter table public.tabla_amortizacion enable row level security;
create policy "amortizacion_auth" on public.tabla_amortizacion
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- TABLA: pagos
-- ============================================================
create table if not exists public.pagos (
  id                  uuid primary key default uuid_generate_v4(),
  contrato_tipo       text not null check (contrato_tipo in ('arrendamiento','credito')),
  contrato_id         uuid not null,
  cliente_id          uuid not null references public.clientes(id),
  fecha_pago          date not null,
  monto_recibido      numeric(14,2) not null,
  -- Prelación de aplicación
  aplicado_moratorios numeric(14,2) default 0,
  aplicado_intereses  numeric(14,2) default 0,
  aplicado_cargos     numeric(14,2) default 0,
  aplicado_capital    numeric(14,2) default 0,
  -- Meta
  tipo_pago           text default 'Normal'
                        check (tipo_pago in ('Normal','Anticipado','Parcial','Liquidacion')),
  forma_pago          text default 'SPEI'
                        check (forma_pago in ('SPEI','Efectivo','Cheque')),
  referencia          text,
  notas               text,
  registrado_por      uuid references auth.users(id),
  created_at          timestamptz default now()
);

alter table public.pagos enable row level security;
create policy "pagos_auth" on public.pagos
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- TABLA: moratorios
-- ============================================================
create table if not exists public.moratorios (
  id                  uuid primary key default uuid_generate_v4(),
  contrato_tipo       text not null,
  contrato_id         uuid not null,
  fecha_calculo       date not null,
  dias_atraso         int not null,
  saldo_vencido       numeric(14,2) not null,
  tasa_diaria         numeric(10,6) not null,
  monto_moratorio     numeric(14,2) not null,
  iva_moratorio       numeric(14,2) not null,
  total_moratorio     numeric(14,2) not null,
  condonado           boolean default false,
  condonado_por       uuid references auth.users(id),
  motivo_condonacion  text,
  created_at          timestamptz default now()
);

alter table public.moratorios enable row level security;
create policy "moratorios_auth" on public.moratorios
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- FUNCIÓN: trigger updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

create trigger contratos_arr_updated_at
  before update on public.contratos_arrendamiento
  for each row execute function public.set_updated_at();

create trigger contratos_cred_updated_at
  before update on public.contratos_credito
  for each row execute function public.set_updated_at();

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrar usuario
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'analista')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
