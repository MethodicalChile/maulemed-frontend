# MauleMed Frontend

Aplicación de gestión médica basada en Vue 3, Vite, TailwindCSS, Pinia y Vue Router.

## Tecnologías Principales
- **Framework:** Vue 3 (Composition API)
- **Build Tool:** Vite
- **Estilos:** TailwindCSS
- **Estado:** Pinia
- **Router:** Vue Router
- **Validación:** Vee-Validate + Zod
- **Testing:** Vitest + Playwright

## Scripts de Desarrollo
- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Compila para producción (genera `bundle-analysis.html`).
- `npm run lint`: Ejecuta ESLint y corrige errores automáticamente.
- `npm run test`: Ejecuta pruebas unitarias (Vitest).
- `npx playwright test`: Ejecuta pruebas E2E.

## Documentación Técnica
- [Guía de Desarrollo](docs/DEVELOPMENT.md)
- [Estructura del Proyecto](docs/ARCHITECTURE.md)

## Seguridad y Monitoreo
- Sentry está integrado para el monitoreo de errores en tiempo real. Configura `VITE_SENTRY_DSN` en tu archivo `.env`.

## Configuración del Entorno
Crea un archivo `.env` en la raíz de `maulemed-frontend` basado en `.env.example` con las variables de entorno requeridas.
