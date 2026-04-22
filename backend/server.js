const express = require("express");
const cors = require("cors");

require("./models/db");

const app = express();

app.use(cors());
app.use(express.json());

const agendamentoRoutes = require("./routes/agendamentoRoutes");
const barbeiroRoutes = require("./routes/barbeiroRoutes");

app.use("/api", agendamentoRoutes);
app.use("/api/barbeiro", barbeiroRoutes);

app.get("/", (req, res) => {
  res.send("Servidor rodando 🚀");
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000.");
});
