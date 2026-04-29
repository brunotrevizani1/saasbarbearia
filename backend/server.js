const express = require("express");
const cors = require("cors");
const path = require("path");

require("./models/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const agendamentoRoutes = require("./routes/agendamentoRoutes");
const barbeiroRoutes = require("./routes/barbeiroRoutes");
const authRoutes = require("./routes/authRoutes");

app.use("/api", agendamentoRoutes);
app.use("/api/barbeiro", barbeiroRoutes);
app.use("/api", authRoutes);

app.get("/", (req, res) => {
  res.send("Servidor rodando 🚀");
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000.");
});
