# MapleStory 2 Handbook - Frontend

**Project Path:** `d:\Projetos\Maple2_Codex\MapleStory2-Handbook`
**Related Backend:** `d:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`

## Project Overview

A full-stack SvelteKit web application that provides a searchable database of MapleStory 2 game content (items, NPCs, maps, quests, achievements, etc.). The frontend displays data parsed and populated by the backend GameParser.

**Framework Stack:**
- Svelte 5.47.1 (component framework with runes)
- SvelteKit 2.50.0 with SSR (Node.js adapter)
- TypeScript 5.9.3 (strict mode)
- Tailwind CSS 4.1.18
- Skeleton UI 4.10.0 (component library)
- Prisma 7.2.0 (ORM - read-only access to database)
- Vite 7.3.1 (build tool)

**Key Libraries:**
- Lucide Svelte 0.562.0 (icon library)
- Zod 4.3.5 (schema validation)
- Floating UI 1.7.4 (tooltips/popovers)
- Rate Limiter Flexible 5.0.5 (API rate limiting)

## Project Structure

```
src/
├── routes/              # SvelteKit file-based routing
│   ├── api/            # Backend API endpoints for search/tracking
│   ├── items/          # Item catalog and detail pages
│   ├── npcs/           # NPC database pages
│   ├── maps/           # Map pages
│   ├── quests/         # Quest pages
│   ├── dyes/           # Dye system pages
│   ├── patchnotes/     # Patch notes pages
│   ├── about/          # Static pages
│   └── +layout.svelte  # Root layout
├── lib/
│   ├── components/     # Reusable Svelte components
│   ├── generated/      # Auto-generated Prisma client (do not edit)
│   ├── helpers/        # Utility functions
│   ├── types/          # TypeScript interfaces
│   ├── prismaClient.ts # Database singleton instance
│   └── Enums.ts        # Game data enumerations
└── static/             # Static assets (images, 3D models, GIFs)
```

## Svelte 5 Runes

This project uses **Svelte 5 runes** - do NOT use Svelte 4 syntax.

**Component state and props:**
```svelte
<script lang="ts">
  // Props (replaces `export let`)
  let { name, count = 0 }: { name: string; count?: number } = $props();

  // Reactive state (replaces `let x` with `$:`)
  let value = $state(0);

  // Derived values (replaces `$: derived = ...`)
  let doubled = $derived(value * 2);

  // Side effects (replaces `$: { ... }` blocks)
  $effect(() => {
    console.log('value changed:', value);
  });
</script>
```

**DO NOT use Svelte 4 patterns:**
- `export let prop` → use `$props()` instead
- `$: reactive = ...` → use `$derived()` or `$effect()` instead
- `on:click={handler}` → use `onclick={handler}` instead (Svelte 5 event syntax)

## Tailwind CSS v4

This project uses **Tailwind CSS v4** - do NOT generate v3-style config.

- **No `tailwind.config.js`** - configuration is CSS-first, done in the main CSS file via `@theme`
- **No `@apply` with v3 directives** - use utility classes directly
- Import syntax: `@import "tailwindcss"` (not `@tailwind base/components/utilities`)
- Custom theme values are defined with `@theme { --color-X: ...; }` in CSS

## Key Dependencies

- **Backend Integration:** Prisma ORM connects to MySQL database populated by the backend GameParser
- **API Routes:** `/src/routes/api/*` - Search and view tracking endpoints
- **View Tracking:** POST requests increment `visit_count` in the database (rate-limited to 2 requests per 5 minutes per IP)

## Important Integration Points

### ⚠️ Prisma Schema Changes DO NOT Create New Data

**Critical:** The Prisma schema (`prisma/schema.prisma`) is pulled from the MySQL database using `pnpm db:pull`. The database structure is created and populated by the backend GameParser.

**Data Flow for Schema Updates:**
```
Backend GameParser
  ↓ (creates tables & populates)
MySQL Database
  ↓ (introspected via `pnpm db:pull`)
prisma/schema.prisma
  ↓ (generates types via `prisma generate`)
TypeScript types in src/lib/generated/
```

- **DO NOT** manually modify the Prisma schema to add new tables/columns expecting them to create data
- **DO NOT** edit `schema.prisma` directly - it will be overwritten on the next `pnpm db:pull`
- **Changes to Prisma schema** only affect the TypeScript types available to the frontend
- **New data** comes exclusively from the backend GameParser parsing raw MapleStory 2 game files
- **To add new data types or fields:**
  1. Modify the backend GameParser parsers
  2. Run GameParser to create/update database tables and populate data
  3. Pull updated schema: `pnpm db:pull` (runs `prisma db pull && prisma generate`)
  4. Update frontend components to use new fields

### Database Connection

- **Environment:** `DATABASE_URL` in `.env` (example: `mysql://root:gelo96@localhost:3310/maple2_codex`)
- **ORM:** Prisma with MariaDB adapter
- **Access Pattern:** Read-only through Prisma Client in API routes and page loaders
- **Singleton:** `src/lib/prismaClient.ts` provides single shared Prisma instance

### Data Flow

```
Backend GameParser
  ↓ (populates)
MySQL Database (items, npcs, maps, quests, achieves, additional_effects, item_boxes)
  ↓ (read via)
Prisma Client
  ↓ (queried by)
SvelteKit API Routes (/api/items, /api/npcs, etc.)
  ↓ (fetched by)
Frontend Components & Pages
```

## API Endpoints

Located in `src/routes/api/*/+server.ts`

**GET Endpoints (Search):**
```
/api/items?search=term&limit=20&page=0&rarity=X&job=X&type=X
/api/npcs?search=term&limit=20&page=0
/api/maps?search=term&limit=20&page=0
/api/quests?search=term&limit=20&page=0
/api/trophies?search=term&limit=20&page=0
```

**POST Endpoints (View Tracking):**
```
/api/items?id=123    (increments visit_count)
/api/npcs?id=123
/api/maps?id=123
/api/quests?id=123
/api/trophies?id=123
```

## Development & Build

**⚠️ Important Development Notes:**
- **Assume the dev server is already running** - Do NOT run `pnpm dev` unless explicitly asked
- **For type checking**, use `pnpm check` instead of building
- **Do NOT** run `pnpm build` just to check for type errors

**Installation:**
```bash
pnpm install
# Extract static assets (7z files to static/resource/image/)
pnpm exec prisma generate
```

**Important Build Step:**
- `pnpm build` runs `pnpm exec prisma generate && vite build`
- Prisma client is regenerated from schema.prisma
- Generated types are output to `src/lib/generated/prisma/`

**Commands:**
- `pnpm dev` - Development server (port 4000) - **DO NOT RUN unless explicitly requested**
- `pnpm check` - Type check with svelte-check - **USE THIS for type validation**
- `pnpm check:watch` - Type check in watch mode
- `pnpm build` - Build for production - **DO NOT use for type checking**
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint and Prettier checks
- `pnpm format` - Auto-format code with Prettier
- `pnpm db:pull` - Pull database schema and regenerate Prisma client

## Development Workflow

**Typical development process:**
1. Make code changes in your editor
2. Changes auto-reload in the running dev server (assume it's already running)
3. Check types with `pnpm check` if needed
4. Format code with `pnpm format` before committing
5. Run `pnpm lint` to ensure code quality

**DO NOT:**
- Start the dev server (`pnpm dev`) unless explicitly asked
- Build the project (`pnpm build`) to check for type errors
- Modify Prisma schema expecting it to create new data

**DO:**
- Use `pnpm check` for type validation
- Edit existing files rather than creating new ones when possible
- Keep changes focused and minimal

## When to Contact Backend Team

- Adding new game content types (not just new entries)
- Adding new calculated fields or statistics
- Changing how raw data is parsed or transformed
- Fixing issues where data doesn't match the game client

## When to Modify Frontend Only

- UI/UX changes, new filters, better search
- Adding new pages or views for existing data
- Performance optimizations in rendering
- Styling and theme changes
- Client-side caching and state management
