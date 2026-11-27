// Deja vacía la base de las pruebas de punta a punta (toctar_e2e). Lo ejecuta
// playwright.config.ts antes de levantar el servidor, que al arrancar aplica las
// migraciones y crea el dueño de prueba (src/lib/arranque.ts).
import pg from "pg";

const admin = new pg.Client({ connectionString: "postgres://toctar:toctar@localhost:5432/postgres" });
await admin.connect();
await admin.query("drop database if exists toctar_e2e with (force)");
await admin.query("create database toctar_e2e");
await admin.end();
console.log("Base toctar_e2e lista.");
