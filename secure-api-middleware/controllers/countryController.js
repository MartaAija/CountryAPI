/**
 * Country Data Controller Module
 * Handles all country data retrieval and processing operations, including:
 * - Fetching all countries from external API
 * - Searching for specific countries
 * - Processing and formatting country data for consistent response
 */

const axios = require('axios'); // HTTP client for making requests to external API

/**
 * processCountryData
 * Transforms raw country data from external API into a consistent, simplified format
 * 
 * @param {Object} country - Raw country data from external API
 * @returns {Object|null} - Processed country data or null if processing fails
 */
const processCountryData = (country) => {
    try {
        // Extract and format currency information
        let currency = null;
        if (country.currencies) {
            // Get the first currency code (some countries have multiple currencies)
            const currencyCode = Object.keys(country.currencies)[0];
            const currencyInfo = country.currencies[currencyCode];
            
            currency = {
                code: currencyCode,
                name: currencyInfo.name,
                symbol: currencyInfo.symbol || '' // Default to empty string if no symbol
            };
        }

        // Return a consistent data structure for all countries
        // This simplifies the data for the frontend and ensures consistency
        return {
            name: country.name.common,
            capital: country.capital?.[0] || 'N/A', // Optional chaining with fallback
            currency: currency,
            languages: country.languages ? Object.values(country.languages) : [],
            flag: country.flags.png
        };
    } catch (error) {
        // Return null for invalid countries
        return null;
    }
};

/**
 * fetchCountriesWithRetry
 * Fetches country data from external API with retry mechanism for resilience
 * 
 * @param {number} retries - Maximum number of retry attempts
 * @returns {Promise<Array>} - Array of country data from external API
 */
const fetchCountriesWithRetry = async (retries = 3) => {
    // Configure axios with longer timeout and keep-alive
    const axiosInstance = axios.create({
        timeout: 15000, // Increased timeout to 15 seconds
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'CountryAPI/1.0',
            'Connection': 'keep-alive'
        }
    });

    for (let i = 0; i < retries; i++) {
        try {
            // Try multiple alternative URLs in case one is blocked
            let response;
            try {
                // Primary URL
                response = await axiosInstance.get('https://restcountries.com/v3.1/all');
            } catch (primaryError) {
                // Alternative URL (sometimes helps bypass network restrictions)
                response = await axiosInstance.get('https://restcountries.com/v3.1/all?fields=name,capital,currencies,languages,flags');
            }
            return response.data;
        } catch (error) {
            // If we've reached the maximum retries, throw the error
            if (i === retries - 1) throw error;
            
            // Exponential backoff: wait longer between each retry
            // 1st retry: 1 second, 2nd retry: 2 seconds, 3rd retry: 4 seconds
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
};

/**
 * getAllCountries
 * Handler for fetching all countries with error handling
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAllCountries(req, res) {
    try {
        // Fetch countries with retry mechanism for reliability
        const countriesData = await fetchCountriesWithRetry();
        
        // Process and filter the data to ensure consistent format
        // This maps each country through the processor and filters out any null results
        const processedData = countriesData
            .map(processCountryData)
            .filter(country => country !== null);

        // Verify we have valid data to return
        if (processedData.length === 0) {
            throw new Error('No valid country data received');
        }
        
        // Return processed data as JSON
        res.json(processedData);
    } catch (error) {
        // Detailed user-friendly error message
        res.status(500).json({ 
            error: 'Failed to fetch countries',
            message: 'The external API is currently unavailable. Please try again later.'
        });
    }
}

/**
 * searchCountries
 * Handler for searching countries by name
 * 
 * @param {Object} req - Express request object with search query parameter
 * @param {Object} res - Express response object
 */
async function searchCountries(req, res) {
    try {
        // Extract search query from request parameters
        const { query } = req.params;
        
        // Get all countries and filter them locally instead of making another API call
        // This is more reliable when the external API might have connection issues
        const allCountries = await fetchCountriesWithRetry();
        const processedData = allCountries
            .map(processCountryData)
            .filter(country => country !== null)
            .filter(country => 
                country.name.toLowerCase().includes(query.toLowerCase())
            );
        
        // Return filtered data as JSON
        res.json(processedData);
    } catch (error) {
        // Special handling for "not found" responses
        if (error.response?.status === 404) {
            res.json([]); // Return empty array for no results (better UX than an error)
        } else {
            // General error handling
            res.status(500).json({ 
                error: 'Failed to search countries',
                message: 'The external API is currently unavailable. Please try again later.'
            });
        }
    }
}

// Export the controller functions for use in routes
module.exports = {
    getAllCountries,
    searchCountries
}; 