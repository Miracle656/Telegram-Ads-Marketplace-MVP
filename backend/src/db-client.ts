// Temporary database client without Prisma
// Use this until Prisma engines can be downloaded

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = {
    query: (text: string, params?: any[]) => pool.query(text, params),

    // Helper for transactions
    transaction: async (callback: (client: any) => Promise<any>) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
};

export default db;
