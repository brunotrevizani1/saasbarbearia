const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  user: "dev",
  password: "1234",
  database: "barbearia",
});

connection.connect((err) => {
  if (err) {
    console.error("Erro ao conectar:", err);
  } else {
    console.log("MySQL conectado");
  }
});

module.exports = connection;
