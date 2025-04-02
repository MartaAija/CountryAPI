const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('./db');

// Middleware to verify API key
const verifyApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }

    try {
        // Check both primary and secondary keys
        const [rows] = await db.query(
            `SELECT id, api_key_primary, is_active_primary, api_key_secondary, is_active_secondary 
             FROM users 
             WHERE (api_key_primary = ? AND is_active_primary = 1) 
             OR (api_key_secondary = ? AND is_active_secondary = 1)`,
            [apiKey, apiKey]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or inactive API key' });
        }

        // Update last_used timestamp for the matching key
        const user = rows[0];
        if (apiKey === user.api_key_primary) {
            // Use NOW() function to ensure a valid MySQL timestamp
            await db.query(
                'UPDATE users SET last_used_primary = NOW() WHERE id = ?',
                [user.id]
            );
            console.log(`Updated last_used_primary timestamp for user ${user.id}`);
        } else if (apiKey === user.api_key_secondary) {
            // Use NOW() function to ensure a valid MySQL timestamp
            await db.query(
                'UPDATE users SET last_used_secondary = NOW() WHERE id = ?',
                [user.id]
            );
            console.log(`Updated last_used_secondary timestamp for user ${user.id}`);
        }

        next();
    } catch (error) {
        console.error('API key verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Helper function to process country data
const processCountryData = (country) => {
    try {
        // Process currency data
        let currency = null;
        if (country.currencies) {
            const currencyCode = Object.keys(country.currencies)[0];
            const currencyInfo = country.currencies[currencyCode];
            currency = {
                code: currencyCode,
                name: currencyInfo.name,
                symbol: currencyInfo.symbol || ''
            };
        }

            return {
                name: country.name.common,
            capital: country.capital?.[0] || 'N/A',
            currency: currency,
                languages: country.languages ? Object.values(country.languages) : [],
                flag: country.flags.png
            };
    } catch (error) {
        console.error('Error processing country data:', error);
        return null;
    }
};

// Get all countries with retry mechanism
const fetchCountriesWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get('https://restcountries.com/v3.1/all', {
                timeout: 5000,
                headers: {
                    'Accept': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
    }
};

// Get all countries
router.get('/all', verifyApiKey, async (req, res) => {
    try {
        const countriesData = await fetchCountriesWithRetry();
        const processedData = countriesData
            .map(processCountryData)
            .filter(country => country !== null);

        if (processedData.length === 0) {
            throw new Error('No valid country data received');
        }

        res.json(processedData);
    } catch (error) {
        console.error('Error fetching all countries:', error);
        res.status(500).json({ 
            error: 'Failed to fetch countries',
            message: 'The external API is currently unavailable. Please try again later.'
        });
    }
});

// Search countries by name
router.get('/search/:query', verifyApiKey, async (req, res) => {
    try {
        const { query } = req.params;
        const response = await axios.get(`https://restcountries.com/v3.1/name/${query}`, {
            timeout: 5000,
            headers: {
                'Accept': 'application/json'
            }
        });
        const processedData = response.data
            .map(processCountryData)
            .filter(country => country !== null);
        res.json(processedData);
    } catch (error) {
        if (error.response?.status === 404) {
            res.json([]); // Return empty array if no countries found
        } else {
            console.error('Error searching countries:', error);
            res.status(500).json({ 
                error: 'Failed to search countries',
                message: 'The external API is currently unavailable. Please try again later.'
            });
        }
    }
});

module.exports = router; 