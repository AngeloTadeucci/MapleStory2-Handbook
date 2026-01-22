# MapleStory 2 Handbook - Frontend

**Project Path:** `d:\Projetos\Maple2_Codex\MapleStory2-Handbook`
**Related Backend:** `d:\Projetos\Maple2_Codex\MapleStory2-Handbook-BackEnd`

## Project Overview

A full-stack SvelteKit web application that provides a searchable database of MapleStory 2 game content (items, NPCs, maps, quests, achievements, etc.). The frontend displays data parsed and populated by the backend GameParser.

**Framework Stack:**
- SvelteKit 2.50.0 with SSR (Node.js adapter)
- TypeScript 5.9.3 (strict mode)
- Tailwind CSS 4.1.18 with Skeleton UI
- Prisma 7.2.0 (ORM - read-only access to database)
- Vite 7.3.1 (build tool)

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

## Key Dependencies

- **Backend Integration:** Prisma ORM connects to MySQL database populated by the backend GameParser
- **API Routes:** `/src/routes/api/*` - Search and view tracking endpoints
- **View Tracking:** POST requests increment `visit_count` in the database (rate-limited to 2 requests per 5 minutes per IP)

## Important Integration Points

### ⚠️ Prisma Schema Changes DO NOT Create New Data

**Critical:** The Prisma schema (`prisma/schema.prisma`) is generated from the MySQL database structure created by the backend GameParser.

- **DO NOT** modify the Prisma schema to add new tables/columns expecting them to create data
- **Changes to Prisma schema** only affect the TypeScript types available to the frontend
- **New data** comes exclusively from the backend GameParser parsing raw MapleStory 2 game files
- **To add new data types or fields:**
  1. Modify the backend GameParser parsers
  2. Run GameParser to populate the database
  3. Regenerate Prisma schema: `pnpm exec prisma generate`
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

**Installation:**
```bash
pnpm install
# Extract static assets (7z files to static/resource/image/)
pnpm exec prisma generate
pnpm dev        # Dev server on port 4000
pnpm build      # Production build
```

**Important Build Step:**
- `pnpm build` runs `bunx prisma generate && vite build`
- Prisma client is regenerated from schema.prisma
- Generated types are output to `src/lib/generated/prisma/`

**Commands:**
- `pnpm dev` - Development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm format` - Auto-format code with Prettier

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
