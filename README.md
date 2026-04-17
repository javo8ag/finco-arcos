# FINCO ARCOS — Plataforma de Administración de Créditos

Plataforma web para administración de contratos de arrendamiento financiero y crédito simple.
Stack: React + Vite + TailwindCSS + Supabase + Netlify.

---

## Instalación local

### Requisitos
- Node.js v18+, Git, cuenta Supabase, cuenta Netlify

### Pasos
```bash
git clone https://github.com/TU_USUARIO/finco-arcos.git
cd finco-arcos
npm install
cp .env.example .env   # luego rellena con tus claves Supabase
npm run dev            # abre http://localhost:5173
```

### Base de datos
1. En Supabase → **SQL Editor** → **New Query**
2. Pega el contenido de `supabase/schema.sql` → **Run**

### Primer usuario admin
1. Supabase → **Authentication** → **Users** → **Add User**
2. Ejecuta en SQL Editor:
```sql
UPDATE public.perfiles SET rol = 'super_admin', nombre = 'Tu Nombre'
WHERE email = 'tu@email.com';
```

---

## Deploy en Netlify
1. Sube a GitHub: `git push origin main`
2. Netlify → **Add new site** → GitHub → selecciona el repo
3. En **Environment variables** agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
4. Deploy

---

## Estructura
```
src/
├── components/layout/   # Sidebar, MainLayout
├── components/ui/       # ProtectedRoute y componentes reutilizables
├── pages/               # dashboard, clientes, contratos, pagos, reportes, configuracion
├── hooks/               # useAuth
├── lib/                 # Cliente Supabase
├── store/               # Estado global Zustand
└── utils/               # Formato moneda MXN, fechas CDMX, validación RFC
supabase/
└── schema.sql           # Base de datos completa con RLS
```

---

## Roles de usuario
| Rol | Acceso |
|---|---|
| super_admin | Todo, todos los portafolios |
| admin_fo | Solo su portafolio (family office) |
| analista | Crear expedientes, no aprobar |
| cobrador | Registrar pagos únicamente |
| lectura | Solo dashboards |

---
Finco Arcos S.A. de C.V. · Querétaro, México
