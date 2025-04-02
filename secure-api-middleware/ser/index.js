const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const countryRoutes = require('./routes/countryRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api/countries', countryRoutes);

// Basic root route
app.get('/', (req, res) => {
    res.send('Secure API Middleware is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});