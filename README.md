# Hosteleria

Monorepo de landings para grupo de restauración. Cada local es una app Astro independiente que comparte componentes y tokens de diseño.

## Stack

- **pnpm workspaces** — gestor de paquetes
- **Turborepo** — orquestador de tareas (cache de builds)
- **Astro 5** — sitio estático por app
- **Tailwind CSS 4** — estilos (configuración CSS-first)

## Estructura

```
hosteleria/
├── apps/
│   ├── pubilla/
│   ├── la-principal/
│   ├── roure/
│   ├── guixot/
│   └── casabella/
└── packages/
    ├── ui/                 → componentes Astro compartidos
    └── tailwind-config/    → tokens base de diseño
```

## Comandos

```bash
pnpm install              # instalar todo
pnpm dev                  # arranca las 5 apps en paralelo
pnpm build                # build de las 5 apps
pnpm --filter pubilla dev # arranca solo una app
```

## Añadir un nuevo local

1. Duplica una carpeta en `apps/` (ej. `cp -r apps/pubilla apps/nuevo-local`)
2. Cambia `name` en `apps/nuevo-local/package.json`
3. Ajusta tokens de marca en `src/styles/global.css`
4. `pnpm install`

## Personalización por local

Cada app puede:

- **Sobrescribir colores / tipografías** editando `@theme` en `src/styles/global.css`
- **Elegir variante de un componente** vía props (`<Hero variant="split" />`)
- **Crear un componente propio** en `src/components/` si diverge del compartido — no tocar `packages/ui`
