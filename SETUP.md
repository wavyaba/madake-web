# Corporación Madake — Guía de instalación y despliegue

## Estructura del proyecto

```
madake/
├── public/
│   └── index.html              ← Página web principal
├── src/
│   ├── lib/
│   │   ├── supabase.js         ← Cliente Supabase (usa variables de entorno)
│   │   └── validation.js       ← Validación y protección contra inyecciones
│   └── app/
│       └── api/
│           └── leads/
│               └── route.js    ← API endpoint seguro (solo corre en servidor)
├── supabase/
│   └── migrations/
│       └── 001_leads_rls.sql   ← Tabla + RLS + políticas de Supabase
├── .env.example                ← Plantilla de variables de entorno
├── .gitignore                  ← Excluye .env.local y node_modules
└── package.json
```

---

## Paso 1 — Crear cuenta y proyecto en Supabase

1. Ve a https://app.supabase.com y crea una cuenta gratuita.
2. Haz clic en **New project**.
3. Elige un nombre (ej. `madake-leads`), una contraseña segura para la BD, y la región **South America (São Paulo)** para menor latencia desde México.
4. Espera ~2 minutos a que el proyecto se inicialice.

---

## Paso 2 — Ejecutar la migración SQL

1. En tu proyecto de Supabase, ve al menú lateral → **SQL Editor**.
2. Haz clic en **New query**.
3. Copia y pega todo el contenido del archivo `supabase/migrations/001_leads_rls.sql`.
4. Haz clic en **Run** (▶).
5. Verifica que aparezca el mensaje `Success. No rows returned`.

Esto crea:
- La tabla `leads` con validaciones a nivel de BD.
- Row Level Security activado.
- Políticas RLS: el público solo puede insertar, los admins pueden leer/actualizar.
- Una función de rate limiting por correo.

---

## Paso 3 — Obtener las credenciales de Supabase

1. En tu proyecto, ve a **Settings** → **API**.
2. Copia estos tres valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ La `service_role` key tiene acceso total a la BD. Nunca la expongas en el frontend.

---

## Paso 4 — Crear cuenta en Resend (correo)

1. Ve a https://resend.com y crea una cuenta gratuita (10,000 correos/mes gratis).
2. Ve a **Settings** → **API Keys** → **Create API Key**.
3. Copia la clave → `RESEND_API_KEY`.
4. (Opcional pero recomendado) Verifica tu dominio en Resend → **Domains** para enviar desde `@corporacionmadake.com.mx`.

---

## Paso 5 — Configurar variables de entorno localmente

```bash
# En la raíz del proyecto:
cp .env.example .env.local
```

Edita `.env.local` con tus valores reales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
NOTIFICATION_EMAIL=contacto@corporacionmadake.com.mx
```

---

## Paso 6 — Instalar dependencias y correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000 — deberías ver la página de Madake.
Prueba el formulario y verifica que aparezca el lead en Supabase → **Table Editor** → **leads**.

---

## Paso 7 — Desplegar en Vercel (recomendado)

### Opción A — Desde la interfaz web de Vercel

1. Sube el proyecto a GitHub (el `.gitignore` ya excluye `.env.local`).
2. Ve a https://vercel.com → **Add New Project** → importa tu repositorio.
3. En el paso de configuración, ve a **Environment Variables** y agrega las 5 variables de tu `.env.local`.
4. Haz clic en **Deploy**.

### Opción B — Desde la terminal

```bash
npm install -g vercel
vercel login
vercel --prod
# Vercel te pedirá las variables de entorno en la primera vez
```

### Variables de entorno en Vercel

En el panel de Vercel → tu proyecto → **Settings** → **Environment Variables**:

| Variable | Entorno |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Development |
| `RESEND_API_KEY` | Production, Preview, Development |
| `NOTIFICATION_EMAIL` | Production, Preview, Development |

---

## Paso 8 — Crear usuario admin en Supabase

Para que tú puedas leer los leads desde el panel (respetando RLS):

1. En Supabase → **Authentication** → **Users** → **Invite User**.
2. Ingresa tu correo de trabajo.
3. Una vez creado, ve a **SQL Editor** y ejecuta:

```sql
-- Reemplaza el UUID con el ID del usuario que acabas de crear
-- Lo encuentras en Authentication → Users
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE id = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';
```

Ahora ese usuario puede ver los leads en la vista `leads_admin_view`.

---

## Resumen de capas de seguridad implementadas

| Capa | Qué protege |
|---|---|
| Variables de entorno | Las credenciales nunca están en el código fuente |
| `.gitignore` | `.env.local` nunca se sube a Git |
| Validación en cliente | Feedback inmediato al usuario (UX) |
| Validación en servidor (`validation.js`) | Independiente del cliente, no se puede saltear |
| Detección de SQL Injection | Patrones detectados antes de llegar a la BD |
| Detección de XSS | Patrones HTML/JS maliciosos bloqueados |
| Consultas parametrizadas (Supabase) | La librería nunca concatena strings en SQL |
| CHECK constraints en PostgreSQL | Validación a nivel de BD como última barrera |
| Row Level Security (RLS) | El público solo puede INSERT, nunca SELECT/UPDATE/DELETE |
| Rate limiting en servidor | Máx 3 solicitudes/hora por IP |
| Rate limiting en BD | Máx 3 leads/hora por correo electrónico |
| Cabeceras de seguridad HTTP | Previenen clickjacking y sniffing de MIME |
