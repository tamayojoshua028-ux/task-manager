const mysql = require('mysql2/promise');
require('dotenv').config();

// Priority: DATABASE_URL first, then individual variables
let dbConfig;

if (process.env.DATABASE_URL) {
    console.log('✅ Using DATABASE_URL for connection');
    dbConfig = process.env.DATABASE_URL;
} else {
    console.log('⚠️ Using individual DB variables');
    dbConfig = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
        queueLimit: 0,
        dateStrings: true,
        timezone: 'local',
        ssl: {
            rejectUnauthorized: false
        }
    };
}

const db = mysql.createPool(dbConfig);

(async () => {
    try {
        const connection = await db.getConnection();
        console.log('✅ Connected to MySQL database successfully!');
        connection.release();
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
})();

module.exports = db;
