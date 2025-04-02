const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") }); // Adjust path if needed

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConn() {
    try {
        const testConnection = await pool.getConnection();
        console.log("✅ Database connection successful");

        // Check table structure
        const [tables] = await pool.query("SHOW TABLES");
        console.log("Available tables:", tables);

        const [columns] = await pool.query("DESCRIBE users");
        console.log("Users table structure:", columns);

        testConnection.release();
    } catch (err) {
        console.log("❌ Database connection error:", err.message);
    }
}

testConn();

module.exports = pool;

