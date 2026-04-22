# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Approach

- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Skip files over 100KB unless explicitly required.
- Suggest running /cost when a session is running long to monitor cache ratio.
- Recommend starting a new session when switching to an unrelated task.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.

---

## Commands

```bash
npm run dev      # start dev server (Vite, port 5173)
npm run build    # production build → dist/
npm run lint     # ESLint check
npm run preview  # serve the dist/ build locally
```

No test suite is configured.

## Environment

Requires a `.env` file (or Netlify env vars) with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SUPABASE_SERVICE_ROLE_KEY=...   # required for user management (super_admin only)
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required at startup — app throws immediately if missing. `VITE_SUPABASE_SERVICE_ROLE_KEY` is only needed when calling `usuariosApi.js`; the admin client is lazy-initialized so its absence does not break the app.

## Architecture

**Stack:** React 19 + Vite, TailwindCSS 3, Supabase (PostgreSQL + Auth + RLS), Zustand, React Router v6, React Hook Form + Zod, Recharts, jsPDF + autoTable, date-fns, papaparse.

**Deployment:** Netlify (frontend) + Supabase (backend). No server-side code — all logic runs in the browser against the Supabase JS client.

### Auth & routing

`useAuth` (hook) → listens to Supabase `onAuthStateChange` → writes into `useAuthStore` (Zustand). `ProtectedRoute` wraps all routes inside `MainLayout`. The `perfiles` table extends `auth.users` with `rol` (`super_admin`, `admin_fo`, `analista`, `cobrador`, `lectura`) and `portafolio` (the family office filter for `admin_fo`).

### Multi-portfolio

`usePortafolioStore` (persisted Zustand) holds `portafolioActivo` (string | null). `null` means "Consolidado" — no filter applied. Every data-fetching page calls `getFiltroPortafolio()` and passes it to the API layer. All `getContratos*`, `getClientes`, `getPagosPendientes`, `getDashboardData` accept a `portafolio` param and conditionally add `.eq('portafolio', portafolio)` to the Supabase query. The `SelectorPortafolio` component in the Sidebar lets `super_admin` switch; `admin_fo` sees their assigned portfolio as read-only.

### Financial calculation engine

All amortization math lives in `src/utils/amortizacion.js` — no server involvement:

- **Arrendamiento (leasing):** French PMT formula with balloon/residual value: `(PV × i × factor − FV × i) / (factor − 1)`. Charges (GPS, seguro, admin) added on top each period.
- **Crédito simple:** French or German method, no residual value.
- IVA (16%) applies to intereses ordinarios and moratorios, **not** to capital.
- All monetary values are rounded to 2 decimal places via `round2`.

### Payment prelation

`src/utils/prelacion.js` → `aplicarPrelacion(montoRecibido, filasPendientes, tasaMoratoria)`:

Mandatory order: ① Moratorios + IVA → ② Intereses ordinarios + IVA → ③ Cargos adicionales → ④ Capital. Returns `filasActualizar` (array of `{ id, estatus_pago }`) and the breakdown applied to each tier. This result is passed directly to `pagosApi.registrarPago`.

### Automatic moratorios

`sincronizar_moratorios()` is a Supabase SQL RPC function (defined in `supabase/moratorios.sql`). It marks overdue `tabla_amortizacion` rows as `'Atrasado'`, flips contract status to `'En mora'`, and reverts to `'Activo'` when payments catch up. It is called silently from the frontend on every page load of Pagos and Moratorios — no pg_cron or server required. The `moratorios_activos` view aggregates current moratorio exposure per contract.

### Data layer (`src/lib/`)

| File | Responsibility |
|------|---------------|
| `supabase.js` | Single anon Supabase client instance |
| `adminClient.js` | Lazy-initialized service-role client (`getAdminClient()`); throws if `VITE_SUPABASE_SERVICE_ROLE_KEY` is missing |
| `clientesApi.js` | CRUD for `clientes` |
| `contratosApi.js` | CRUD for `contratos_arrendamiento` + `contratos_credito`; generates and inserts `tabla_amortizacion` rows on create |
| `pagosApi.js` | `registrarPago` (multi-step); `getPagosPendientes`; `getMoratoriosActivos`; `sincronizarMoratorios` (RPC) |
| `dashboardApi.js` | `getDashboardData(portafolio)` + `getKPIsExtendidos(portafolio, baseData)` fetching all KPIs in parallel |
| `importApi.js` | CSV template generators, per-row validators, and `importarFilaArrendamiento` / `importarFilaCredito` — upserts client by RFC, creates contract + amortization table, marks `pagos_realizados` rows as Pagado |
| `usuariosApi.js` | User management via service-role client (`listarUsuarios`, `crearUsuario`, `actualizarUsuario`); own-profile updates via anon client (`actualizarMiPerfil`, `cambiarPassword`, `cambiarEmail`) |
| `pldApi.js` | PLD/FT module: alertas OR/OI/OIP, consultas a listas negras, expedientes vencidos, verificación automática de umbrales en efectivo |

### Contracts — two types, one list

`contratos_arrendamiento` and `contratos_credito` are separate tables with separate routes (`/contratos/:id` vs `/contratos/credito/:id`). The `Contratos.jsx` list combines both with a `_tipo` flag. `RegistrarPago` is shared via a `tipoContrato` prop.

`tabla_amortizacion` stores rows for both types; the `contrato_tipo` column (`'arrendamiento'` | `'credito'`) distinguishes them since there is no foreign key polymorphism.

### Bulk import (`/importacion`)

`src/pages/importacion/Importacion.jsx` — two-tab flow (Arrendamiento / Crédito):
1. Download CSV template (generated in browser via `plantillaArrendamiento()` / `plantillaCredito()`)
2. Upload CSV → parsed with papaparse → validated per row → preview table with expandable errors
3. Import valid rows: upsert client by RFC → create contract → mark first `pagos_realizados` amortization rows as `Pagado`

### User management (`/configuracion`)

`src/pages/configuracion/Configuracion.jsx` — visible only to `super_admin`. Uses `getAdminClient()` to call `auth.admin.createUser()` and bypass RLS for listing/editing all profiles. Non-super_admin users see an access-denied screen.

### Mi cuenta (`/mi-cuenta`)

`src/pages/cuenta/MiCuenta.jsx` — accessible to all roles. Updates `perfiles.nombre` via anon client; changes email/password via `supabase.auth.updateUser()`.

### PDF generation

`src/utils/pdfGenerator.js` uses jsPDF + autoTable. Four exports: `generarEstadoCuenta`, `generarReciboPago`, `generarReporteCartera`, `generarReporteMoratorios`. All share `dibujarHeader` (navy band, FINCO white / ARCOS orange) and `dibujarFooter` (page numbers).

### PLD / FT (`/pld`)

`src/pages/pld/PLD.jsx` — tres tabs: Alertas (OR/OI/OIP), Consultas a listas negras (OFAC/ONU/SAT 69-B/CNBV), Expedientes vencidos (+12 meses sin actualizar). Alertas OR se generan automáticamente al registrar pagos en efectivo que superen umbrales legales (PFAE ≥$300K, PM ≥$500K). Tablas: `pld_alertas`, `pld_consultas_listas`. Campos KYC extendidos en `clientes`: `actividad_economica`, `pep_parentesco`, `estructura_corporativa`, `perfil_monto_promedio`, `perfil_frecuencia`, `perfil_forma_pago`, `fecha_actualizacion_expediente`.

### Shared utilities

- `src/utils/format.js` — `formatCurrency` (MXN), `formatDate` (TZ-safe, appends `T12:00:00` to avoid UTC offset shifts), `validarRFC` (PFAE 13-char / PM 12-char regex), `estatusColor` (badge CSS class).
- Badge CSS classes (`badge-success`, `badge-warning`, `badge-danger`, `badge-info`, `badge-gray`) are defined in Tailwind global styles.

### Database schema

SQL files in `supabase/` must be run manually in the Supabase SQL Editor — there is no migration runner. Key tables: `perfiles`, `clientes`, `contratos_arrendamiento`, `contratos_credito`, `tabla_amortizacion`, `pagos`, `moratorios`, `pld_alertas`, `pld_consultas_listas`. All tables have RLS enabled. The `handle_new_user()` trigger auto-inserts into `perfiles` on signup.

**RLS pitfall — never add a self-referential policy on `perfiles`:** A policy like `EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'super_admin')` causes infinite recursion (HTTP 500) because evaluating the policy triggers the same policy again. Use `auth.uid() = id` for row-level access. Admin operations that need to read all profiles must use the service-role client (`getAdminClient()`) which bypasses RLS entirely.

## Brand / Design tokens

Primary `#2d43d0`, Accent `#ff7900`, Navy `#02106c`. Font: Archivo (Google Fonts). Used verbatim in jsPDF output and Tailwind config — keep consistent when adding PDF reports or new UI sections.
