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
        console.error('Error processing country data:', error);
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
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Attempt ${i+1} to fetch country data from external API`);
            // Request to external API with timeout and headers
            const response = await axios.get('https://restcountries.com/v3.1/all', {
                timeout: 5000, // 5 second timeout prevents hanging requests
                headers: {
                    'Accept': 'application/json'
                }
            });
            console.log(`Successfully fetched ${response.data.length} countries from external API`);
            return response.data;
        } catch (error) {
            console.error(`Error on attempt ${i+1}:`, error.message);
            
            // If we've reached the maximum retries, throw the error
            if (i === retries - 1) throw error;
            
            // Exponential backoff: wait longer between each retry
            // 1st retry: 1 second, 2nd retry: 2 seconds, 3rd retry: 3 seconds
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
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
    console.log('getAllCountries API call received');
    
    // FOR TESTING: If the external API is down, use this mock data
    if (process.env.USE_MOCK_DATA === 'true') {
        console.log('Using mock country data');
        return res.json([
            {
                name: "United States",
                capital: "Washington, D.C.",
                currency: { code: "USD", name: "United States dollar", symbol: "$" },
                languages: ["English"],
                flag: "https://flagcdn.com/w320/us.png"
            },
            {
                name: "United Kingdom",
                capital: "London",
                currency: { code: "GBP", name: "British pound", symbol: "£" },
                languages: ["English"],
                flag: "https://flagcdn.com/w320/gb.png"
            }
        ]);
    }
    
    try {
        // Fetch countries with retry mechanism for reliability
        const countriesData = await fetchCountriesWithRetry();
        
        // Process and filter the data to ensure consistent format
        console.log('Processing country data...');
        // This maps each country through the processor and filters out any null results
        const processedData = countriesData
            .map(processCountryData)
            .filter(country => country !== null);

        // Verify we have valid data to return
        if (processedData.length === 0) {
            console.error('No valid country data received from external API');
            throw new Error('No valid country data received');
        }

        console.log(`Returning ${processedData.length} processed countries`);
        // Return processed data as JSON
        res.json(processedData);
    } catch (error) {
        console.error('Error in getAllCountries:', error);
        // Log additional details about the error
        if (error.response) {
            console.error('Error response status:', error.response.status);
            console.error('Error response data:', error.response.data);
        } else if (error.request) {
            console.error('No response received from external API');
        }
        
        // Detailed user-friendly error message
        res.status(500).json({ 
            error: 'Failed to fetch countries',
            message: 'The external API is currently unavailable. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        
        // Request specific countries from external API based on search term
        const response = await axios.get(`https://restcountries.com/v3.1/name/${query}`, {
            timeout: 5000,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // Process and filter data for consistency
        const processedData = response.data
            .map(processCountryData)
            .filter(country => country !== null);
            
        // Return processed data as JSON
        res.json(processedData);
    } catch (error) {
        // Special handling for "not found" responses
        if (error.response?.status === 404) {
            res.json([]); // Return empty array for no results (better UX than an error)
        } else {
            console.error('Error in searchCountries:', error);
            // General error handling
            res.status(500).json({ 
                error: 'Failed to search countries',
                message: 'The external API is currently unavailable. Please try again later.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

// Export the controller functions for use in routes
module.exports = {
    getAllCountries,
    searchCountries
}; 