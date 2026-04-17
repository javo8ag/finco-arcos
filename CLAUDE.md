# CLAUDE.md - Token Efficient Rules

1. Think before acting. Read existing files before writing code.
2. Be concise in output but thorough in reasoning.
3. Prefer editing over rewriting whole files.
4. Do not re-read files you have already read unless the file may have changed.
5. Test your code before declaring done.
6. No sycophantic openers or closing fluff.
7. Keep solutions simple and direct.
8. User instructions always override this file.

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (Vite, port 5173)
npm run build    # production build → dist/
npm run lint     # ESLint check
npm run preview  # serve the dist/ build locally
```

No test suite is configured. There is no single-test command.

## Environment

Requires a `.env` file (or Netlify env vars) with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The app throws immediately on startup if these are missing (`src/lib/supabase.js`).

## Architecture

**Stack:** React 19 + Vite, TailwindCSS 3, Supabase (PostgreSQL + Auth + RLS), Zustand, React Router v6, React Hook Form + Zod, Recharts, jsPDF + autoTable, date-fns.

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
| `supabase.js` | Single Supabase client instance |
| `clientesApi.js` | CRUD for `clientes` |
| `contratosApi.js` | CRUD for `contratos_arrendamiento` + `contratos_credito`; generates and inserts `tabla_amortizacion` rows on create |
| `pagosApi.js` | `registrarPago` (multi-step: insert pago, update tabla_amortizacion rows, insert moratorio record); `getPagosPendientes`; `getMoratoriosActivos`; `sincronizarMoratorios` (RPC) |
| `dashboardApi.js` | Single `getDashboardData(portafolio)` that fetches all KPIs, buckets, charts in parallel |

### Contracts — two types, one list

`contratos_arrendamiento` and `contratos_credito` are separate tables with separate routes (`/contratos/:id` vs `/contratos/credito/:id`). The `Contratos.jsx` list combines both with a `_tipo` flag. `RegistrarPago` is shared via a `tipoContrato` prop.

`tabla_amortizacion` stores rows for both types; the `contrato_tipo` column (`'arrendamiento'` | `'credito'`) distinguishes them since there is no foreign key polymorphism.

### PDF generation

`src/utils/pdfGenerator.js` uses jsPDF + autoTable. Four exports: `generarEstadoCuenta`, `generarReciboPago`, `generarReporteCartera`, `generarReporteMoratorios`. All share `dibujarHeader` (navy band, FINCO white / ARCOS orange) and `dibujarFooter` (page numbers).

### Shared utilities

- `src/utils/format.js` — `formatCurrency` (MXN), `formatDate` (TZ-safe, appends `T12:00:00` to avoid UTC offset shifts), `validarRFC` (PFAE 13-char / PM 12-char regex), `estatusColor` (badge CSS class).
- Badge CSS classes (`badge-success`, `badge-warning`, `badge-danger`, `badge-info`, `badge-gray`) are defined in Tailwind global styles.

### Database schema

SQL files in `supabase/` must be run manually in the Supabase SQL Editor — there is no migration runner. Key tables: `perfiles`, `clientes`, `contratos_arrendamiento`, `contratos_credito`, `tabla_amortizacion`, `pagos`, `moratorios`. All tables have RLS enabled; the general policy is `auth.role() = 'authenticated'`. The `handle_new_user()` trigger auto-inserts into `perfiles` on signup.

## Brand / Design tokens

Primary `#2d43d0`, Accent `#ff7900`, Navy `#02106c`. Font: Archivo (Google Fonts). These are used verbatim in jsPDF output and Tailwind config — keep them consistent when adding PDF reports or new UI sections.
