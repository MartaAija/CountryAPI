/**
 * Country Controller Module
 * Handles country data retrieval from REST Countries API
 */
const axios = require('axios');

// REST Countries API base URL
const REST_COUNTRIES_API = 'https://restcountries.com/v3.1';

/**
 * Get all countries
 * Fetches and formats country data from the REST Countries API
 */
async function getAllCountries(req, res) {
    try {
    // Fetch data from REST Countries API
    const response = await axios.get(`${REST_COUNTRIES_API}/all`);
    
    // Transform the data to match our expected format
    const formattedData = response.data.map(country => ({
      name: country.name.common,
      flag: country.flags.png,
      capital: country.capital ? country.capital[0] : 'N/A',
      currency: country.currencies ? {
        name: Object.values(country.currencies)[0].name,
        code: Object.keys(country.currencies)[0],
        symbol: Object.values(country.currencies)[0].symbol
      } : null,
      languages: country.languages ? Object.values(country.languages) : []
    }));
    
    // Sort data by country name
    const sortedData = formattedData.sort((a, b) => a.name.localeCompare(b.name));
    
    res.json(sortedData);
    } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch country data' });
    }
}

/**
 * Search countries
 * Searches for countries by name, currency, or language
 */
async function searchCountries(req, res) {
    try {
    const { query, type = 'name' } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    // Fetch all countries first
    const response = await axios.get(`${REST_COUNTRIES_API}/all`);
    
    // Transform the data to match our expected format
    const formattedData = response.data.map(country => ({
      name: country.name.common,
      flag: country.flags.png,
      capital: country.capital ? country.capital[0] : 'N/A',
      currency: country.currencies ? {
        name: Object.values(country.currencies)[0].name,
        code: Object.keys(country.currencies)[0],
        symbol: Object.values(country.currencies)[0].symbol
      } : null,
      languages: country.languages ? Object.values(country.languages) : []
    }));
    
    // Filter based on search type
    let results;
    const searchQuery = query.toLowerCase();
    
    switch (type) {
      case 'currency':
        results = formattedData.filter(country => {
          if (!country.currency) return false;
          const currencyName = country.currency.name.toLowerCase();
          const currencyCode = country.currency.code.toLowerCase();
          const currencySymbol = country.currency.symbol ? country.currency.symbol.toLowerCase() : '';
          return currencyName.includes(searchQuery) || 
                 currencyCode.includes(searchQuery) || 
                 currencySymbol.includes(searchQuery);
        });
        break;
        
      case 'language':
        results = formattedData.filter(country => 
          country.languages.some(lang => 
            lang.toLowerCase().includes(searchQuery)
          )
        );
        break;
        
      default: // name search
        results = formattedData.filter(country => 
          country.name.toLowerCase().includes(searchQuery)
        );
        break;
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error searching countries:', error);
    res.status(500).json({ error: 'Failed to search countries' });
  }
}

/**
 * Get country by name
 * Fetches a specific country by its name
 */
async function getCountryByName(req, res) {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json({ error: 'Country name is required' });
    }
    
    // Fetch country data from REST Countries API
    const response = await axios.get(`${REST_COUNTRIES_API}/name/${name}`);
    
    if (!response.data || response.data.length === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }
    
    // Format the country data
    const country = response.data[0];
    const formattedData = {
      name: country.name.common,
      flag: country.flags.png,
      capital: country.capital ? country.capital[0] : 'N/A',
      currency: country.currencies ? {
        name: Object.values(country.currencies)[0].name,
        code: Object.keys(country.currencies)[0],
        symbol: Object.values(country.currencies)[0].symbol
      } : null,
      languages: country.languages ? Object.values(country.languages) : []
    };
    
    res.json(formattedData);
    } catch (error) {
    console.error('Error fetching country:', error);
    if (error.response && error.response.status === 404) {
      res.status(404).json({ error: 'Country not found' });
        } else {
      res.status(500).json({ error: 'Failed to fetch country data' });
    }
  }
}

/**
 * Get countries with post counts
 * Returns countries with the count of blog posts for each
 */
async function getCountriesWithPostCounts(req, res) {
  try {
    // This is a placeholder - in a real implementation, you would:
    // 1. Fetch all countries from REST Countries API
    // 2. Query your database for post counts by country
    // 3. Combine the data
    
    // For now, we'll just return the countries
    const response = await axios.get(`${REST_COUNTRIES_API}/all`);
    
    // Transform the data to match our expected format
    const formattedData = response.data.map(country => ({
      name: country.name.common,
      flag: country.flags.png,
      postCount: 0 // Placeholder - would be populated from database
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching countries with post counts:', error);
    res.status(500).json({ error: 'Failed to fetch countries with post counts' });
  }
}

module.exports = {
    getAllCountries,
  searchCountries,
  getCountryByName,
  getCountriesWithPostCounts
}; 