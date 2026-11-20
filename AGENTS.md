# AGENTS.md — Arquitectura, Convenciones y Estado del Repositorio (`Unext-WebApplication`)

Este documento describe con exactitud el estado actual, la arquitectura, las convenciones de desarrollo, el sistema de diseño y los puntos de extensión del frontend de **UNEXT** (ecosistema interuniversitario y laboral para Postulantes, Empresas Reclutadoras e Instituciones Educativas), basado 100% en la inspección directa del código fuente del repositorio.

---

## 1. Stack Técnico y Versiones Reales

### Dependencias y Herramientas (`package.json` & `angular.json`)
- **Gestor de paquetes:** `pnpm@12.14.0` (configurado en `package.json` y `angular.json` bajo `cli.packageManager: "pnpm"`).
- **Framework Principal:** Angular `^22.2.0` (`@angular/core`, `@angular/common`, `@angular/forms`, `@angular/platform-browser`, `@angular/router`, `@angular/compiler`).
- **Angular CLI / Build System:** `@angular/cli` `^22.2.3` y `@angular/build` `^22.2.3` (utiliza el builder moderno `@angular/build:application` con punto de entrada en `src/main.ts`).
- **Lenguaje y Runtime Reactivo:**
  - `typescript`: `~6.0.2`
  - `rxjs`: `~7.8.0`
  - `zone.js`: `^0.16.3` (configurado con `provideZoneChangeDetection({ eventCoalescing: true })` en `app.config.ts`)
  - `tslib`: `^2.3.0`
- **Estilos y Post-procesamiento:**
  - `tailwindcss`: `^3.4.19`
  - `postcss`: `^8.5.30`
  - `autoprefixer`: `^10.6.1`
  - `prettier`: `^3.8.1`
- **Testing:**
  - `vitest`: `^5.0.0` y `jsdom`: `^30.0.0` (ejecutados vía `@angular/build:unit-test`).
- **Librerías de Iconos / UI Externas:** **Ninguna instalada.** Todos los iconos del proyecto son **SVGs inline** (`<svg viewBox="0 0 24 24" ...>`) y emojis puntuales de soporte visual (`📌`, `💼`, `🏛️`, `🏢`, `⚡`, `🎯`, `📜`, `📊`, `🔐`). No se deben importar paquetes externos como Lucide, FontAwesome o Angular Material sin autorización previa.

### Configuración de Entornos y Proxy
- **`src/environments/environment.ts`:**
  ```ts
  export const environment = {
    apiUrl: '/api',
  };
  ```
- **`proxy.conf.json`:**
  El comando `pnpm start` ejecuta `ng serve --proxy-config proxy.conf.json`, redirigiendo todas las peticiones de `/api` hacia el backend local en `http://127.0.0.1:8080` (`secure: false`, `changeOrigin: true`).

---

## 2. Estructura y Factorización de Carpetas (`src/app/`)

El proyecto sigue una arquitectura modular por capas (`core`, `shared`, `pages`) con una convención de nombres **sin sufijos redundantes** en los archivos de componentes (ej. `dashboard.ts` y `dashboard.html` en lugar de `dashboard.component.ts`).

```text
src/
├── environments/
│   └── environment.ts                         # Configuración de apiUrl ('/api')
├── styles.css                                 # Directivas Tailwind, fuente Montserrat y clases @layer components
├── main.ts                                    # Bootstrap de la aplicación con appConfig
└── app/
    ├── app.config.ts                          # Providers globales: Router, ZoneChangeDetection, HttpClient + jwtInterceptor
    ├── app.routes.ts                          # Mapa completo de rutas, guards y redirecciones por rol
    ├── app.ts / app.html / app.css            # Componente raíz (<router-outlet />)
    ├── core/                                  # Lógica transversal, seguridad, contratos de datos y servicios singleton
    │   ├── guards/
    │   │   ├── auth.guard.ts                  # authGuard (requiere token) y guestGuard (redirige a /feed si ya hay sesión)
    │   │   └── role.guard.ts                  # roleGuard(...allowedRoles: UserRole[]) con fallback a /feed
    │   ├── interceptors/
    │   │   └── jwt.interceptor.ts             # Inyecta Authorization: Bearer <token> excepto en /api/auth/
    │   ├── models/                            # Interfaces y tipos TypeScript estrictos
    │   │   ├── auth.model.ts                  # UserRole ('POSTULANT' | 'RECRUITER' | 'INSTITUTION'), Session, Login/RegisterRequest
    │   │   ├── chat.model.ts                  # ChatMessage, Contact, Conversation
    │   │   ├── feed.model.ts                  # FeedPostResponse, FeedPostRequest, FeedCommentResponse
    │   │   ├── job.model.ts                   # JobOffer, JobApplication, JobRecommendationResponse, RecruiterApplicationItem, AgreementResponse...
    │   │   ├── notification.model.ts          # NotificationCategory, NotificationItem
    │   │   ├── profile.model.ts               # Modelos de perfil y skills para Postulant, Recruiter e Institution
    │   │   └── validation.model.ts            # AcademicVerificationRequest, SkillValidationRequest/Response
    │   ├── services/                          # Servicios HTTP (@Injectable({ providedIn: 'root' }))
    │   │   ├── auth.service.ts                # Login, registro, decodificación JWT, Signals de sesión y rol, localStorage
    │   │   ├── chat.service.ts                # Bandeja (/messages/inbox), historial (/messages/history/:id) y envío (/messages/send)
    │   │   ├── connection.service.ts          # Grafo social (/connections/overview, status, request, accept, remove, follow)
    │   │   ├── directory.service.ts           # Directorio unificado (forkJoin de los 3 roles), caché reactiva de nombres/avatares y peers diarios
    │   │   ├── feed.service.ts                # CRUD de posts del muro (/feed), likes, comentarios y fijado de publicaciones importantes
    │   │   ├── job.service.ts                 # Buscador público (/jobs), recomendaciones, postulaciones y panel privado (/recruiter/jobs, agreements)
    │   │   ├── notification.service.ts        # Notificaciones (/notifications) con polling automático cada 10s y unreadCount computed
    │   │   ├── profile.service.ts             # CRUD de perfiles (/profiles/{role}/me), skills, vistas públicas y verificación OTP organizacional
    │   │   └── validation.service.ts          # Solicitudes de verificación académica y validación de skills (/validations)
    │   └── utils/                             # Funciones puras utilitarias
    │       ├── api-error.ts                   # readApiError(): normaliza errores HTTP (0, 401, 403, strings o JSON detail/message)
    │       ├── file-media.ts                  # resizeImageFile() en Canvas (JPEG 0.86), readFileAsDataUrl(), processFeedMediaFile() (máx 8MB)
    │       ├── format.ts                      # toDate() (soporta ISO string y arrays de Spring Boot), formatMoney() (PEN), formatPosted(), initials()
    │       └── labels.ts                      # Diccionarios de traducción a español (modalityLabel, experienceLabel, applicationLabel, roleLabel...)
    ├── shared/                                # Componentes UI reutilizables entre páginas
    │   └── components/
    │       ├── alert-modal/                   # Modal de confirmación/alerta con variantes ('warning' | 'info' | 'danger')
    │       ├── navbar/                        # Barra superior sticky adaptativa por rol, buscador global inteligente y polling de notificaciones
    │       ├── profile-cv-card/               # Tarjeta de subida, vista previa PDF en iframe seguro (DomSanitizer) y descarga de CV
    │       ├── profile-sidebar/               # Barra lateral de perfiles (Publicaciones importantes fijadas + Personas sugeridas en la red)
    │       ├── profile-skills-card/           # Tarjeta de habilidades técnicas, selector de Top Skills (★ máx 3) y estado de sello institucional
    │       └── toast/                         # Notificación flotante (bottom-right) con variantes ('success' | 'info' | 'warning' | 'error')
    └── pages/                                 # Vistas principales enrutadas
        ├── auth/
        │   ├── login/                         # login.ts / login.html
        │   └── register/                      # register.ts / register.html (selector de 3 segmentos con reglas de negocio dinámicas)
        ├── dashboard/                         # dashboard.ts / dashboard.html / dashboard.css (Feed central + widgets laterales adaptativos por rol)
        ├── institution/                       # institution-portal.ts / institution-portal.html (Centro de Gestión Académica y Empleabilidad)
        ├── jobs/
        │   ├── job-search.ts / .html          # Buscador y recomendador de empleos para POSTULANT (vista split master-detail en desktop)
        │   └── recruiter/
        │       └── recruiter-jobs.ts / .html  # Centro de vacantes, embudo ATS de candidatos, convenios y explorador de mercado para RECRUITER
        ├── messages/                          # messages.ts / messages.html (Chat en tiempo real con polling de 8s entre conexiones confirmadas)
        ├── network/                           # network.ts / network.html (Mi Red: gestión de invitaciones, conexiones, seguimiento y directorio)
        ├── notifications/                     # notifications.ts / notifications.html (Centro de notificaciones filtrable con redirección inteligente)
        └── profile/
            ├── postulant/                     # postulant-profile.ts/.html (propio) y public-pos-profile.ts/.html (público)
            ├── recruiter/                     # recruiter-profile.ts/.html (propio + modal OTP) y public-rec-profile.ts/.html (público)
            └── institution/                   # institution-profile.ts/.html (propio + modal OTP) y public-inst-profile.ts/.html (público)
```

---

## 3. Patrones de Desarrollo y Estado en Uso

### Estructura de Componentes y Control Flow
- **100% Standalone Components:** Todos los componentes declaran `standalone: true` e importan directamente sus dependencias (`CommonModule`, `FormsModule`, `RouterLink`, etc.). No existen `NgModules`.
- **Inyección de Dependencias:** Se utiliza exclusivamente la función `inject()` de `@angular/core` como propiedades de clase (`private authService = inject(AuthService);`), nunca inyección por constructor.
- **Inputs y Outputs basados en Signals:** Los componentes compartidos (`Navbar`, `Toast`, `AlertModal`, `ProfileCvCard`, `ProfileSidebar`, `ProfileSkillsCard`) utilizan las funciones modernas `input<T>()` y `output<T>()` de `@angular/core` en lugar de los decoradores tradicionales `@Input()` y `@Output()`.También se usa `viewChild<ElementRef>('scroller')` en `Messages`.
- **Control Flow Moderno en Plantillas:** Las vistas HTML utilizan exclusivamente la sintaxis nativa `@if / @else`, `@for (...; track ...)` (con bloques `@empty`) y `@switch / @case`.

### Gestión de Estado Reactivo
- **Signals (`signal`, `computed`, `effect`):**
  - Todo el estado local de las vistas (listas de datos, banderas de carga `isLoading`, pestañas activas `activeTab`, modales abiertos, filtros y notificaciones `toast`) se modela con `signal<T>()`.
  - Los derivados de UI (contadores, listas filtradas, iniciales, validaciones de permisos, textos seguros de banners) se calculan de forma declarativa mediante `computed(() => ...)`.
  - Se utiliza `effect()` junto con `untracked()` en páginas como `JobSearch` y `Messages` para reaccionar automáticamente a cambios en `this.auth.session()`.
- **RxJS (`Observable`, `forkJoin`, `interval`, `takeUntilDestroyed`):**
  - Las llamadas HTTP retornan `Observable<T>`.
  - Se emplea `forkJoin` con `catchError(() => of(...))` para cargas paralelas resilientes (ej. `DirectoryService.load()` e `InstitutionPortal`).
  - **Polling en tiempo real:** `NotificationService` sincroniza notificaciones cada **10 segundos** (`interval(10000)`), y `Messages` actualiza la bandeja e historial activo cada **8 segundos** (`interval(8000).pipe(takeUntilDestroyed())`).

### Manejo de Formularios y Archivos Multimedia
- **Enfoque de Formularios:** No se usa `ReactiveFormsModule` (`FormGroup`/`FormControl`). Se utilizan dos patrones limpios:
  1. **`FormsModule` + `[(ngModel)]`** sobre objetos planos tipados en el componente (ej. `form: PostulantProfileRequest`, `jobForm: JobOfferRequest`, `agreementForm: AgreementCreateRequest`) o propiedades primitivas (`email`, `password`, `newPostContent`), validando manualmente en el método `onSubmit()` / `save*()`.
  2. **Bindings directos con Signals** en buscadores y filtros reactivos (`[value]="keyword()"` + `(input)="onKeyword($event)"`), como en `JobSearch` y `Messages`.
- **Procesamiento Client-Side de Archivos (`file-media.ts`):**
  - Los avatares/logos se redimensionan en el navegador con HTML5 Canvas a **400×400 px** (`resizeImageFile(file, 400, 400)`, JPEG calidad 0.86) y las portadas/banners a **1584×396 px** antes de enviarse como DataURL Base64 al backend.
  - Los documentos (CV en PDF/DOC/DOCX hasta 5 MB, evidencias académicas hasta 5 MB, convenios hasta 6 MB y multimedia de feed hasta 8 MB) se convierten a DataURL con `readFileAsDataUrl()` o `processFeedMediaFile()`.

### Comunicación HTTP, Seguridad y Sesión de los 3 Roles
- **`HttpClient` e Interceptor (`jwtInterceptor`):**
  - Configurado en `app.config.ts` mediante `provideHttpClient(withInterceptors([jwtInterceptor]))`.
  - `jwtInterceptor` lee `localStorage.getItem('unext_token')` y clona la petición agregando el header `Authorization: Bearer ${token.trim()}` a todas las solicitudes cuya URL **no** contenga `/api/auth/`.
- **Gestión de Sesión (`AuthService`):**
  - Maneja 3 roles definidos por `UserRole = 'POSTULANT' | 'RECRUITER' | 'INSTITUTION'`.
  - Al iniciar sesión o registrarse, decodifica el payload del JWT (`window.atob`) como respaldo y persiste en `localStorage` cuatro claves oficiales:
    - `unext_token`
    - `unext_role`
    - `unext_user_id`
    - `unext_profile_completed`
  - Expone los signals reactivos `currentUserRole` y `session`.
- **Guards (`authGuard`, `guestGuard`, `roleGuard`):**
  - `authGuard`: Permite el paso si existe `authService.getToken()`; de lo contrario redirige a `/login`.
  - `guestGuard`: Protege `/login` y `/register`; si el usuario ya tiene token, lo redirige a `/feed`.
  - `roleGuard(...allowedRoles)`: Verifica token y comprueba si el rol almacenado (`getStoredRole()`) está dentro de `allowedRoles`; si intenta acceder a una ruta de otro segmento, lo redirige de forma segura a `/feed`.
- **Flujo de Onboarding y Verificación Organizacional (OTP):**
  - Tras autenticarse en `Login` o `Register`, si el perfil del segmento aún no existe o está incompleto, se redirige a `/onboarding/complete-profile`, donde se abre automáticamente el modal de creación inicial (`isFirstTimeOnboarding = signal(true)`).
  - Mientras `POSTULANT` se activa de inmediato al completar su perfil, los roles `RECRUITER` (validación de RUC de 11 dígitos que inicia con 10 o 20) e `INSTITUTION` (validación de dominio educativo) requieren verificar un **código OTP de 6 dígitos** (`POST /api/profiles/organization/verify` y `/resend-code`).

---

## 4. Sistema de Diseño y Paleta de Colores Real

UNEXT posee una identidad visual limpia estilo red profesional moderna (inspirada en LinkedIn + guía propia UNEXT). Coexisten tokens definidos en `tailwind.config.js` con valores hexadecimales arbitrarios de Tailwind en las plantillas que deben respetarse estrictamente para mantener coherencia visual.

### Paleta de Colores Exacta

| Propósito / Token | Clase Tailwind Config (`tailwind.config.js`) | Clases Arbitrarias Usadas en Plantillas | Valor Hexadecimal |
| :--- | :--- | :--- | :--- |
| **Azul Primario UNEXT** | `bg-primary`, `text-primary` | `bg-[#274DEA]`, `text-[#274DEA]`, `border-[#274DEA]` | `#2C4DE6` (config) / **`#274DEA`** (predominante en UI) |
| **Azul Primario Hover** | `hover:bg-primary-hover` | `hover:bg-[#1E3BB8]` | `#2440C0` (config) / **`#1E3BB8`** (UI) |
| **Azul Primario Oscuro (Gradientes Auth)** | — | `to-[#11247A]` | **`#11247A`** |
| **Azul Primario Suave** | `bg-primary-soft` | `bg-[#274DEA]/10`, `bg-[#DBEAFE]` | `#E8EEFF` / `#DBEAFE` |
| **Celeste Secundario** | `bg-secondary`, `bg-secondary-soft` | `text-[#8EB9FC]`, `bg-[#8EB9FC]/20` | `#8EBAF9` / **`#8EB9FC`** |
| **Lavanda / IA & Match** | `bg-lavender`, `bg-lavender-soft` | `bg-[#C3A7FF]`, `hover:bg-[#B392F8]`, `text-[#2E1065]` | **`#C3A7FF`** (fondo) / **`#2E1065`** (texto profundo IA) |
| **Verde Institucional / Acreditación** | `text-accent` | `bg-[#059669]`, `hover:bg-[#047857]`, `bg-[#ECFDF5]` | **`#059669`** (institucional) / **`#ECFDF5`** (fondo suave) |
| **Verde Éxito / Validado** | `bg-success`, `bg-success-soft` | `bg-[#10B981]`, `bg-[#DCFCE7]`, `text-[#10B981]` | `#12B886` (config) / **`#10B981`** (UI) |
| **Ámbar Advertencia / Pendiente / Pin** | `bg-warning`, `bg-warning-soft` | `bg-[#FEF3C7]`, `text-[#F59E0B]`, `text-[#B45309]` | **`#F59E0B`** (icono) / **`#B45309`** (texto) / **`#FEF3C7`** (fondo) |
| **Rojo Destructivo / Error** | `bg-danger`, `bg-danger-soft` | `bg-[#EF4444]`, `hover:bg-[#DC2626]`, `bg-[#FEE2E2]` | `#F24443` (config) / **`#EF4444`** (UI) |
| **Superficie / Fondo de Página** | `bg-surface` | `bg-[#F8FAFC]`, `bg-[#F4F2EE]/60` | `#F7F8FC` / **`#F8FAFC`** |
| **Texto Principal (Ink)** | `text-ink` | `text-gray-900` | `#0F1217` / `#111827` |
| **Texto Secundario (Muted)** | `text-ink-muted` | `text-[#6B7280]` | **`#6B7280`** |
| **Bordes / Líneas Divisoras** | `border-line` | `border-gray-200`, `border-gray-200/80`, `border-gray-100` | `#E6E8EE` / `#E5E7EB` |

### Tipografía
- **Fuente Global Real:** `'Montserrat', sans-serif` (importada de Google Fonts en `src/styles.css` con pesos `400;500;600;700` y aplicada a `html, body`). *(Nota: `tailwind.config.js` declara `Inter` en `fontFamily.sans`, pero la regla global de `src/styles.css` aplica `Montserrat` en toda la aplicación).*
- **Jerarquía de Tamaños Recurrentes (Arbitrary Pixel Sizes):**
  - Títulos principales (H1 de página/auth): `text-[28px] font-bold text-gray-900` o `text-2xl sm:text-3xl font-extrabold tracking-tight`.
  - Títulos de sección / modales (H2/H3): `text-[18px] font-bold text-gray-900` o `text-[15px] font-bold`.
  - Cuerpo de texto y posts: `text-[14px]` o `text-[13px]` con `leading-relaxed`.
  - Subtítulos y metadatos: `text-[12px] text-[#6B7280]` o `text-[11px]`.
  - Badges y píldoras: `text-[10px] font-bold uppercase tracking-wider`.
  - Códigos (RUC, código de alumno, dominios, OTP): `font-mono`.

### Componentes Visuales y Clases Globales (`src/styles.css`)
- **Botones Oficiales (`@layer components`):**
  - `.btn-primary`: Botón azul principal (`bg-primary text-white rounded-lg px-4 py-2.5 text-sm font-semibold shadow-md shadow-primary/20 hover:bg-primary-hover`).
  - `.btn-secondary`: Botón blanco con borde azul (`border border-primary/20 bg-white text-primary hover:bg-primary-soft`).
  - `.btn-match`: Botón para acciones de **Inteligencia Artificial / Match** (`bg-[#C3A7FF] hover:bg-[#B392F8] text-[#2E1065] font-semibold rounded-xl px-4 py-2.5`).
  - `.btn-institutional`: Botón verde esmeralda para acreditaciones y acciones institucionales (`bg-[#059669] hover:bg-[#047857] text-white font-semibold rounded-xl px-4 py-2.5`).
  - `.btn-destructive`: Botón rojo de eliminación/rechazo (`bg-[#EF4444] hover:bg-[#DC2626] text-white font-semibold rounded-xl px-4 py-2.5`).
- **Tarjetas (Cards):**
  - Clase utilitaria `.card` (`rounded-xl border border-line bg-white shadow-card` donde `shadow-card` es `0 8px 24px rgba(44, 77, 230, 0.08)`).
  - Patrón directo en vistas: `bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5` (o `p-6`).
- **Campos de Formulario:**
  - Clase `.field` o patrón `w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[15px] text-gray-900 placeholder-[#6B7280]/60 focus:outline-none focus:border-[#274DEA] focus:ring-2 focus:ring-[#274DEA]/15 transition-all`.
- **Badges de Icono (`.icon-badge-*`):**
  - `.icon-badge-success` (`bg-[#DCFCE7] text-[#10B981]`), `.icon-badge-warning` (`bg-[#FEF3C7] text-[#F59E0B]`), `.icon-badge-info` (`bg-[#DBEAFE] text-[#274DEA]`), `.icon-badge-error` (`bg-[#FEE2E2] text-[#EF4444]`).
- **Modales y Animaciones:**
  - Overlay estándar: `fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4`.
  - Caja del modal: `bg-white rounded-2xl max-w-md (o max-w-lg) w-full p-6 shadow-2xl border border-gray-100 animate-fade-in`.
- **Layouts y Breakpoints Responsivos:**
  - Contenedor principal: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
  - Breakpoints estándar de Tailwind: `sm` (`640px`), `md` (`768px`), `lg` (`1024px`, usado para el grid de 3 columnas `lg:grid-cols-12` con `lg:col-span-3` + `lg:col-span-6` + `lg:col-span-3`), y `xl` (`1280px`, usado en `.job-split` `xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]` y `window.matchMedia('(min-width: 1280px)')` en `JobSearch`).

---

## 5. Mapa de Rutas, Funcionalidades por Segmento y Puntos de Integración de IA

### Mapa Completo de Rutas (`src/app/app.routes.ts`)

| Ruta | Guards / Condición (`canMatch` / `canActivate`) | Componente | Descripción |
| :--- | :--- | :--- | :--- |
| `''` | — | Redirección a `'feed'` | Ruta raíz (`pathMatch: 'full'`). |
| `'login'` | `guestGuard` | `Login` | Inicio de sesión unificado con verificación posterior del perfil por rol. |
| `'register'` | `guestGuard` | `Register` | Registro de cuenta con selector de segmento (`POSTULANT`, `RECRUITER`, `INSTITUTION`). |
| `'feed'` (y alias `'dashboard'`) | `authGuard` | `Dashboard` | Muro social multimedia (posts temporales de 7 días o permanentes fijados) y paneles laterales dinámicos según el rol activo. |
| `'profile/me'` | `authGuard` + `canMatch` por rol | `InstitutionProfile` / `RecruiterProfile` / `PostulantProfile` | Perfil propio editable del usuario autenticado según su segmento. |
| `'onboarding/complete-profile'` | `authGuard` + `canMatch` por rol | `InstitutionProfile` / `RecruiterProfile` / `PostulantProfile` | Flujo obligatorio para completar datos de perfil tras el registro inicial. |
| `'profile/view/postulant/:id'` | `authGuard` | `PublicPosProfile` | Vista pública del perfil de un postulante (CV, Top Skills, sellos y botón Conectar). |
| `'profile/view/recruiter/:id'` | `authGuard` | `PublicRecProfile` | Vista pública de una empresa (vacantes activas, comunicados, conectar/seguir). |
| `'profile/view/institution/:id'` | `authGuard` | `PublicInstProfile` | Vista pública de una universidad/instituto (comunicados oficiales, conectar/seguir). |
| `'profile/view/:role/:id'` | `authGuard` | `PublicPosProfile` | Ruta comodín parametrizada por rol para visualización de perfiles públicos. |
| `'directory'` (y alias `'network'`, `'red'`) | `authGuard` | `Network` | Gestión de red profesional: invitaciones recibidas/enviadas, conexiones, siguiendo y recomendaciones filtrables por segmento. |
| `'jobs'` | `authGuard` + `canMatch` (`RECRUITER`) | `RecruiterJobs` | Si un reclutador navega a `/jobs`, abre directamente su centro de vacantes. |
| `'jobs'` | `authGuard` + `roleGuard('POSTULANT')` | `JobSearch` | Buscador de empleos y pestaña "Afines a mi perfil" para postulantes (bloqueado para `INSTITUTION`). |
| `'recruiter/jobs'` (y alias `'agreements'`) | `authGuard` + `roleGuard('RECRUITER')` | `RecruiterJobs` | Panel del reclutador con 3 modos: Mis Vacantes (ATS), Convenios Emitidos (`?tab=agreements`) y Explorador de Mercado (`?tab=market`). |
| `'institution/services'` (y alias `validations`, `servicios`, `sede`, `portal`) | `authGuard` + `roleGuard('INSTITUTION')` | `InstitutionPortal` | Centro de Gestión Académica con 4 servicios: Acreditar Alumnos, Validar Habilidades, Convenios Corporativos y Métricas de Empleabilidad. |
| `'messages'` | `authGuard` | `Messages` | Mensajería directa entre contactos conectados (soporta deep-link `?con=<userId>`). |
| `'notifications'` | `authGuard` | `Notifications` | Centro de alertas categorizadas (`ALL`, `UNREAD`, `JOBS`, `ACADEMIC`, `FEED`) con navegación contextual por rol. |
| `'**'` | — | Redirección a `'feed'` | Fallback para rutas desconocidas. |

### Funcionalidades Implementadas por Segmento

1. **Segmento `POSTULANT` (Estudiantes y Egresados):**
   - Creación y edición de perfil con foto (400×400), portada personalizada o autogenerada (1584×396), CV en PDF/Word con previsualización embebida (`ProfileCvCard`), y gestión de habilidades técnicas (`BASICO`, `INTERMEDIO`, `AVANZADO`) con selección de hasta **3 Aptitudes Principales (Top Skills ★)**.
   - Solicitud de verificación académica (`STUDENT` con código/ciclo/correo institucional o `GRADUATE` con documento de sustento) y solicitud de validación institucional por habilidad con adjunto de evidencia.
   - Publicación en el Feed con límite de hasta **3 publicaciones importantes** permanentes.
   - Búsqueda de vacantes (`JobSearch`), filtro por recomendaciones afines, descarte de ofertas y postulación en 1 clic.

2. **Segmento `RECRUITER` (Empresas):**
   - Onboarding corporativo con validación de RUC peruano (`^(10|20)\d{9}$`) y flujo de verificación mediante **código OTP de 6 dígitos**.
   - Publicación en el Feed con límite de hasta **5 publicaciones importantes** permanentes.
   - Gestión integral de vacantes (`RecruiterJobs`): creación, edición, cierre de ofertas y autocompletado de habilidades sugeridas (`/api/recruiter/skills/suggestions`).
   - Embudo de selección de candidatos (ATS) filtrable por estado (`RECEIVED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`), carrera, ciclo mínimo y habilidad; vista expandida del perfil/CV del candidato; checklist local de entrevista; apertura automática de conexión y chat al pasar a `UNDER_REVIEW`; y emisión de **Convenios de Prácticas Preprofesionales** (con adjunto PDF/Word) cuando la vacante es `TRAINEE` y el alumno está verificado por su universidad.

3. **Segmento `INSTITUTION` (Universidades e Institutos):**
   - Onboarding institucional con limpieza de dominio educativo y verificación por **código OTP de 6 dígitos**.
   - Publicación de comunicados oficiales en el Feed con límite de hasta **6 publicaciones importantes** permanentes.
   - **Centro de Gestión Académica (`InstitutionPortal`):**
     - *Acreditar Alumnos:* Cruza `GET /api/institution/students/pending` con los perfiles públicos para mostrar código, carrera, ciclo y evidencia, permitiendo aprobar o rechazar vinculaciones (`PATCH /api/institution/students/{id}/verify`).
     - *Validar Habilidades:* Revisión de evidencias y aprobación/rechazo de competencias técnicas (`PATCH /api/institution/validations/{id}/status`).
     - *Convenios Corporativos:* Revisión, descarga y firma/rechazo de convenios emitidos por empresas (`PATCH /api/institution/agreements/{id}/status`).
     - *Métricas de Empleabilidad:* Dashboard analítico filtrable por carrera que consume `/api/institution/dashboard/demand-by-career`, `/summary` y `/top-companies`.

---

### Puntos Exactos Identificados para la Integración de Componentes de IA

El código fuente ya cuenta con contenedores visuales, modelos de datos y métodos placeholder preparados específicamente para conectar los servicios de Inteligencia Artificial:

1. **Dashboard Principal (`src/app/pages/dashboard/dashboard.ts` y `dashboard.html`):**
   - **Acción Inteligente de Cabecera (`handleHeaderIntelligentAction()`, líneas 429–438 de `dashboard.ts`):**
     - Botón `.btn-match` en el header superior (líneas 64–73 y 86–95 de `dashboard.html`) que adapta su comportamiento según `currentRole()`:
       - Para **`INSTITUTION`**: Actualmente tiene el comentario `// Función inteligente IA para institución (próximamente) - no hace nada por ahora`. Es el punto de entrada directo para el asistente/diagnóstico IA institucional.
       - Para **`RECRUITER`**: Invoca `openRecruiterJobOptimizer()`.
       - Para **`POSTULANT`**: Invoca `openAiAnalysis(this.recommendations()[0])`.
   - **Diseñador y Optimizador de Vacantes IA para Reclutadores (`dashboard.ts` líneas 60–67, 204–215, 440–454; `dashboard.html` líneas 998–1033 y modal en líneas 1379–1465):**
     - Interfaz `AiJobBlueprint` y signal `generatedBlueprint` con datos estáticos de demostración.
     - Métodos con `// TODO:` listos para conectarse al backend de IA:
       - `openRecruiterJobOptimizer()`
       - `generateBlueprintFromPrompt()` (recibe `aiRolePrompt` y actualmente muestra el toast `'El motor de IA se conectará en una siguiente fase.'`)
       - `copyBlueprintAndGoToJobs()` (para transferir el borrador generado por IA directamente al formulario de creación en `/recruiter/jobs`).
   - **Radar y Pre-filtro de Talento IA para Reclutadores (`dashboard.ts` línea 205; `dashboard.html` líneas 1036–1094 y modal en líneas 1470–1532):**
     - Widget lateral `"Radar de Talento IA"` y modal controlado por `showRecruiterRadarModal` que muestra `verifiedTalentPool()`. Punto listo para enriquecer con ranking semántico o scoring de IA.
   - **Diagnóstico de Compatibilidad y Optimización de Talento IA para Postulantes (`dashboard.ts` líneas 199–200, 456–463; `dashboard.html` líneas 1148–1154, 1174–1188 y modal en líneas 1534–1547):**
     - Signals `selectedJobForAi` e `isAnalyzingAi`, método `openAiAnalysis(job)` con comentario `// TODO: Aquí se implementará el cálculo detallado de compatibilidad IA para el postulante`, y el modal `"Diagnóstico de Compatibilidad"` (líneas 1535–1547) que actualmente solo muestra el título de la vacante y el botón de postular, listo para renderizar el desglose de brechas de habilidades (`matchedSkills` vs `requiredSkills`) y consejos generados por IA.

2. **Buscador de Empleos del Postulante (`src/app/pages/jobs/job-search.ts` y `job-search.html`):**
   - Consume `GET /api/jobs/recommendations` (modo `'recommended'` / `"Afines a mi perfil"`) y renderiza los campos `compatibilityPercent`, `compatibilityLabel` (`LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH` / `ALTA`, `MEDIA`, `BAJA`) y el resaltado diferencial de `matchedSkills` frente a `requiredSkills` en el panel de detalle de la oferta (líneas 231–248 de `job-search.html`).

3. **Embudo de Candidatos del Reclutador (`src/app/pages/jobs/recruiter/recruiter-jobs.ts` y `src/app/core/models/job.model.ts`):**
   - El modelo `RecruiterApplicationItem` (`job.model.ts` líneas 87–89) ya contempla las propiedades `compatibilityPercent?: number | null`, `compatibilityLabel?: CompatibilityLabel` y `matchingHint?: string | null` para mostrar explicaciones de afinidad generadas por IA en las tarjetas de postulantes recibidos.
