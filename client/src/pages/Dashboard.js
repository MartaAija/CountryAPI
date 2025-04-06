// Dashboard component provides a search interface for users to access and filter country data
// Uses the active API key to fetch country information through the secure middleware
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import '../App.css';
import config from '../config';

function Dashboard() {
    // State management for search functionality and data display
    const [searchQuery, setSearchQuery] = useState(''); // Current search input text
    const [countryData, setCountryData] = useState(null); // Complete list of countries
    const [filteredData, setFilteredData] = useState(null); // Countries filtered by search
    const [searchSuggestions, setSearchSuggestions] = useState([]); // Dropdown suggestions while typing
    const [showSuggestions, setShowSuggestions] = useState(false); // Controls visibility of suggestions dropdown
    const [error, setError] = useState(''); // Stores error messages
    const [loading, setLoading] = useState(false); // Indicates when data is being fetched
    const [userApiKey, setUserApiKey] = useState(null); // User's active API key for requests
    const [sortOrder, setSortOrder] = useState('asc'); // Controls sorting direction (ascending/descending)
    const [searchMode, setSearchMode] = useState('country'); // Current search mode (country, currency, language)
    const [showBackToTop, setShowBackToTop] = useState(false); // Controls visibility of back-to-top button
    const searchContainerRef = useRef(null); // Reference to search container for click outside detection

    // Close suggestions dropdown when clicking outside the search container
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                hideDropdown();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Show or hide back-to-top button based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 400);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch all countries using the provided API key - converted to useCallback
    const fetchAllCountries = useCallback(async (apiKey) => {
        console.log('Fetching countries with API key...');
        setLoading(true);
        setError('');
        try {
            console.log(`Using API base URL: ${config.apiBaseUrl}`);
            console.log(`Full URL: ${config.apiBaseUrl}/api/countries/all`);
            console.log(`API Key: ${apiKey.substring(0, 5)}...`); // Only log first 5 chars for security
            
            const response = await axios.get(`${config.apiBaseUrl}/api/countries/all`, {
                headers: { 
                    'X-API-Key': apiKey
                }
            });
            
            console.log('API response received:', response.status);
            const sortedData = sortCountries(response.data, sortOrder);
            setCountryData(sortedData);
            setFilteredData(sortedData);
        } catch (error) {
            console.error('Error fetching countries:', error);
            // Log detailed error information
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Error data:', error.response.data);
                console.error('Error status:', error.response.status);
                console.error('Error headers:', error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received:', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Error message:', error.message);
            }
            
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    }, [sortOrder]);

    // Fetch user's API key and initial country data on component mount
    useEffect(() => {
        const fetchApiKey = async () => {
            try {
                const response = await axios.get(`${config.apiBaseUrl}/auth/profile`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                
                // Try primary key first, then secondary if primary is not active
                if (response.data.api_key_primary && response.data.is_active_primary) {
                    setUserApiKey(response.data.api_key_primary);
                    fetchAllCountries(response.data.api_key_primary);
                } else if (response.data.api_key_secondary && response.data.is_active_secondary) {
                    setUserApiKey(response.data.api_key_secondary);
                    fetchAllCountries(response.data.api_key_secondary);
                } else {
                    setError('No active API key found. Please generate and activate an API key in Settings.');
                }
            } catch (error) {
                setError('Failed to fetch API key');
            }
        };

        fetchApiKey();
    }, [fetchAllCountries]);

    // Update search suggestions based on current search query and mode
    useEffect(() => {
        if (countryData && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            let suggestions = [];

            // Filter suggestions based on search mode (country, currency, language)
            switch(searchMode) {
                case 'currency':
                    suggestions = countryData.filter(country => {
                        const currencyName = country.currency?.name?.toLowerCase() || '';
                        const currencyCode = country.currency?.code?.toLowerCase() || '';
                        const currencySymbol = country.currency?.symbol?.toLowerCase() || '';
                        return currencyName.includes(query) || 
                               currencyCode.includes(query) || 
                               currencySymbol.includes(query);
                    });
                    break;
                case 'language':
                    suggestions = countryData.filter(country => 
                        country.languages.some(lang => 
                            lang.toLowerCase().includes(query)
                        )
                    );
                    break;
                default: // country name search
                    suggestions = countryData.filter(country => 
                        country.name.toLowerCase().includes(query)
                    );
                    break;
            }
            
            // Limit to top 5 suggestions for better UX
            setSearchSuggestions(suggestions.slice(0, 5));
            setShowSuggestions(true);
        } else {
            setSearchSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchQuery, countryData, searchMode]);

    // Sort countries alphabetically by name in ascending or descending order
    const sortCountries = (countries, order) => {
        return [...countries].sort((a, b) => {
            return order === 'asc' 
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name);
        });
    };

    // Toggle sort order between ascending and descending
    const toggleSort = () => {
        const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        setSortOrder(newOrder);
        if (filteredData) {
            const sortedData = sortCountries(filteredData, newOrder);
            setFilteredData(sortedData);
        }
    };

    // Handle API errors with specific messages for different error types
    const handleApiError = (error) => {
        if (error.response?.status === 401) {
            setError('Invalid or inactive API key. Please check your API key in Settings.');
        } else if (error.response?.status === 429) {
            // Rate limit exceeded handling
            const resetTime = error.response.headers['ratelimit-reset'] 
                ? new Date(Number(error.response.headers['ratelimit-reset']) * 1000).toLocaleTimeString()
                : 'a few minutes';
            
            setError(`Rate limit exceeded. You have used all 3 requests in your 15-minute window. Please try again after ${resetTime}.`);
        } else {
            setError('Failed to fetch country data');
        }
    };

    // Hide suggestions dropdown
    const hideDropdown = () => {
        setShowSuggestions(false);
        setSearchSuggestions([]);
    };

    // Handle selection of a country from the suggestions dropdown
    const handleCountrySelect = (country) => {
        setSearchQuery('');  // Clear the search query
        setFilteredData([country]);
        hideDropdown();
    };

    // Change search mode (country, currency, language)
    const handleSearchModeChange = (mode) => {
        setSearchMode(mode);
        setSearchQuery('');
        setFilteredData(countryData);
        setShowSuggestions(false);
        setSearchSuggestions([]);
    };

    // Get appropriate placeholder text based on current search mode
    const getPlaceholderText = () => {
        switch(searchMode) {
            case 'currency':
                return 'Search by currency name or code...';
            case 'language':
                return 'Search by language...';
            default:
                return 'Search for a country...';
        }
    };

    // Handle search form submission
    const handleSearch = async (e) => {
        if (e) {
            e.preventDefault();
        }
        
        // Always hide dropdown first
        hideDropdown();

        if (!searchQuery.trim()) {
            setFilteredData(countryData);
            return;
        }
        if (!userApiKey) {
            setError('No active API key found. Please generate an API key in Settings.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const query = searchQuery.toLowerCase().trim();
            let filteredResults = [];

            // Filter results based on search mode and query
            switch(searchMode) {
                case 'currency':
                    filteredResults = countryData.filter(country => {
                        const currencyName = country.currency?.name?.toLowerCase() || '';
                        const currencyCode = country.currency?.code?.toLowerCase() || '';
                        const currencySymbol = country.currency?.symbol?.toLowerCase() || '';
                        return currencyName.includes(query) || 
                               currencyCode.includes(query) || 
                               currencySymbol.includes(query);
                    });
                    break;
                case 'language':
                    filteredResults = countryData.filter(country => 
                        country.languages.some(lang => 
                            lang.toLowerCase().includes(query)
                        )
                    );
                    break;
                default: // country name search
                    filteredResults = countryData.filter(country => 
                        country.name.toLowerCase().includes(query)
                    );
                    break;
            }

            // Sort the filtered results
            const sortedData = sortCountries(filteredResults, sortOrder);
            setFilteredData(sortedData);
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    };

    // Scroll to top of page - used by back-to-top button
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Render the dashboard UI with search controls and country cards
    return (
        <div className="page-container">
            <h2>Country Information</h2>
            
            {/* Display warning if no API key is available */}
            {!userApiKey && (
                <div className="message error-message">
                    <p>⚠️ No active API key found. Please visit your Settings page to activate your existing API key or generate a new one.</p>
                </div>
            )}
            
            {/* Search mode buttons and search form */}
            <div className="controls">
                <div className="search-modes">
                    <button 
                        className={`mode-button ${searchMode === 'country' ? 'active' : ''}`}
                        onClick={() => handleSearchModeChange('country')}
                    >
                        Search by Country
                    </button>
                    <button 
                        className={`mode-button ${searchMode === 'currency' ? 'active' : ''}`}
                        onClick={() => handleSearchModeChange('currency')}
                    >
                        Search by Currency
                    </button>
                    <button 
                        className={`mode-button ${searchMode === 'language' ? 'active' : ''}`}
                        onClick={() => handleSearchModeChange('language')}
                    >
                        Search by Language
                    </button>
                </div>

                {/* Search input with suggestions dropdown */}
                <div className="search-container" ref={searchContainerRef}>
            <form onSubmit={handleSearch} className="search-form">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={getPlaceholderText()}
                    className="search-input"
                            disabled={!userApiKey}
                        />
                        <div className="search-form-controls">
                            <button 
                                type="submit"
                                disabled={loading || !userApiKey}
                            >
                    {loading ? 'Searching...' : 'Search'}
                </button>
                            <button 
                                type="button"
                                onClick={toggleSort}
                                className="btn-secondary"
                                disabled={!filteredData}
                            >
                                Sort {sortOrder === 'asc' ? '↓' : '↑'}
                            </button>
                            {(searchQuery || (filteredData && countryData && filteredData.length !== countryData.length)) && (
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilteredData(countryData);
                                        hideDropdown();
                                    }}
                                    disabled={!userApiKey}
                                    className="btn-secondary"
                                >
                                    Show All
                                </button>
                            )}
                        </div>
            </form>

                    {/* Search suggestions dropdown */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                        <div className="search-suggestions">
                            {searchSuggestions.map((country, index) => {
                                let displayText = '';
                                switch(searchMode) {
                                    case 'currency':
                                        displayText = `${country.name} (${country.currency?.name || 'N/A'} - ${country.currency?.code || 'N/A'})`;
                                        break;
                                    case 'language':
                                        displayText = `${country.name} (${country.languages.join(', ')})`;
                                        break;
                                    default:
                                        displayText = country.name;
                                }
                                return (
                                    <div 
                                        key={index}
                                        className="suggestion-item"
                                        onClick={() => handleCountrySelect(country)}
                                    >
                                        <img 
                                            src={country.flag} 
                                            alt="" 
                                            className="suggestion-flag"
                                        />
                                        {displayText}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Search message for user guidance */}
            {error && <div className="message search-message"> Start searching with your API Key...🔍</div>}

            {/* Loading indicator - fix the conditional rendering */}
            {loading && (
                <div className="loading-spinner">
                    <p>Loading countries...</p>
                </div>
            )}

            {/* Results counter - shows number of countries being displayed */}
            {filteredData && filteredData.length > 0 && (
                <div className="results-counter text-center" style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                    Displaying {filteredData.length} {filteredData.length === 1 ? 'country' : 'countries'}
                    {searchQuery && ` matching "${searchQuery}"`}
                </div>
            )}

            {/* Country cards grid - displays search results */}
            <div className="countries-grid">
                {filteredData && filteredData.length > 0 ? (
                    filteredData.map((country, index) => (
                <div key={index} className="country-card">
                    <h3>{country.name}</h3>
                    <img src={country.flag} alt={`Flag of ${country.name}`} className="country-flag" />
                    
                    <div className="country-info">
                                <div className="info-row">
                                    <strong>Capital:</strong>
                                    <span>{country.capital || 'N/A'}</span>
                                </div>
                        
                                <div className="info-row">
                            <strong>Currency:</strong>
                                    {country.currency ? (
                                        <span className="currency-details">
                                            {country.currency.name} ({country.currency.code} {country.currency.symbol})
                                        </span>
                                    ) : (
                                        <span>No currency data available</span>
                            )}
                        </div>

                                <div className="info-row">
                            <strong>Languages:</strong>
                                    {country.languages && country.languages.length > 0 ? (
                                        <span className="language-list">
                                {country.languages.map((lang, idx) => (
                                                <span key={idx} className="language-pill">{lang}</span>
                                            ))}
                                        </span>
                                    ) : (
                                        <span>No languages available</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : searchQuery && !loading ? (
                    <div className="no-results-message">
                        <p>No countries found matching "{searchQuery}". Please try a different search term.</p>
                    </div>
                ) : null}
                </div>

            {/* Back to top button - appears when scrolling down */}
            <button 
                className={`back-to-top ${showBackToTop ? 'visible' : ''}`}
                onClick={scrollToTop}
                aria-label="Back to top"
            >
                ↑
            </button>
        </div>
    );
}

export default Dashboard; 