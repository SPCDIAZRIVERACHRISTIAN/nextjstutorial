import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function seedUsers() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );
  `);

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return pool.query(`
        INSERT INTO users (id, name, email, password)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE id=id;
      `, [user.id, user.name, user.email, hashedPassword]);
    }),
  );

  return insertedUsers;
}

async function seedInvoices() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id VARCHAR(36) PRIMARY KEY,
      customer_id VARCHAR(36) NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `);

  const insertedInvoices = await Promise.all(
    invoices.map((invoice) => pool.query(`
      INSERT INTO invoices (id, customer_id, amount, status, date)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE id=id;
    `, [invoice.id, invoice.customer_id, invoice.amount, invoice.status, invoice.date])),
  );

  return insertedInvoices;
}

async function seedCustomers() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `);

  const insertedCustomers = await Promise.all(
    customers.map((customer) => pool.query(`
      INSERT INTO customers (id, name, email, image_url)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE id=id;
    `, [customer.id, customer.name, customer.email, customer.image_url])),
  );

  return insertedCustomers;
}

async function seedRevenue() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `);

  const insertedRevenue = await Promise.all(
    revenue.map((rev) => pool.query(`
      INSERT INTO revenue (month, revenue)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE month=month;
    `, [rev.month, rev.revenue])),
  );

  return insertedRevenue;
}

export async function GET() {
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      await seedUsers();
      await seedCustomers();
      await seedInvoices();
      await seedRevenue();

      await connection.commit();
      connection.release();

      return new Response(JSON.stringify({ message: 'Database seeded successfully' }), { status: 200 });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
}
