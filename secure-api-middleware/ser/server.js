const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const authRoutes = require("./authRoutes");
const countryRoutes = require('./countryRoutes');

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use("/auth", authRoutes);
app.use('/api/countries', countryRoutes);

app.get("/", (req, res) => {
    res.send("Secure API Middleware is running...");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
