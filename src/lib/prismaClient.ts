import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from './generated/prisma/client';
import { env } from '$env/dynamic/private';

function parseConnectionUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: parsed.username,
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1)
  };
}

// Vite HMR re-evaluates this module, which would reset a module level singleton and open a
// new mariadb pool each time. globalThis survives re-evaluation. It is used in production
// too, since a single code path is simpler and the module is only evaluated once there.
const globalForDb = globalThis as typeof globalThis & { __handbookDbClient?: DBClient };

class DBClient {
  public prisma: PrismaClient;

  private constructor() {
    const config = parseConnectionUrl(env.DATABASE_URL);
    const adapter = new PrismaMariaDb({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    });
    this.prisma = new PrismaClient({ adapter });
  }

  public static getInstance = () => {
    globalForDb.__handbookDbClient ??= new DBClient();
    return globalForDb.__handbookDbClient;
  };
}

export default DBClient;
