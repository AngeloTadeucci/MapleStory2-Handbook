import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from './generated/prisma/client';
import { DATABASE_URL } from '$env/static/private';

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

class DBClient {
	public prisma: PrismaClient;
	private static instance: DBClient;

	private constructor() {
		const config = parseConnectionUrl(DATABASE_URL);
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
		if (!DBClient.instance) {
			DBClient.instance = new DBClient();
		}
		return DBClient.instance;
	};
}

export default DBClient;
