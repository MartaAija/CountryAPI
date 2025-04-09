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
    const [hasActiveApiKey, setHasActiveApiKey] = useState(false); // Flag to track if user has an active API key
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
        setLoading(true);
        setError('');
        try {       
            const response = await axios.get(`${config.apiBaseUrl}/api/countries/all`, {
                headers: { 
                    'X-API-Key': apiKey
                }
            });
            // Sort data in the current ascending order - this won't change based on sortOrder
            const sortedData = [...response.data].sort((a, b) => a.name.localeCompare(b.name));
            setCountryData(sortedData);
            setFilteredData(sortedData);
        } catch (error) {
            handleApiError(error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch user's API key and initial country data on component mount
    useEffect(() => {
        const fetchApiKey = async () => {
            try {
                const response = await axios.get(`${config.apiBaseUrl}/auth/profile`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                
                // Try primary key first, then secondary if primary is not active
                let activeKey = null;
                if (response.data.api_key_primary && response.data.is_active_primary) {
                    activeKey = response.data.api_key_primary;
                    setHasActiveApiKey(true);
                } else if (response.data.api_key_secondary && response.data.is_active_secondary) {
                    activeKey = response.data.api_key_secondary;
                    setHasActiveApiKey(true);
                } else {
                    setHasActiveApiKey(false);
                    setError('No active API key found. Please generate and activate an API key in Settings.');
                    return;
                }
                
                // Use the active key to fetch data but don't store it in state
                fetchAllCountries(activeKey);
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

    // Brand new sort function that doesn't interact with search
    const handleSort = () => {
        // Here we'll use a custom approach to prevent any side effects
        if (!filteredData || filteredData.length === 0) {
            return;
        }
        
        try {
            // 1. Toggle the sort order locally to avoid state change triggers
            const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            
            // 2. Create a completely new copy of the current filtered data
            const dataToSort = JSON.parse(JSON.stringify(filteredData));
            
            // 3. Sort the data using a direct array sort to avoid complex logic
            dataToSort.sort((a, b) => {
                if (newSortOrder === 'asc') {
                    return a.name.localeCompare(b.name);
                } else {
                    return b.name.localeCompare(a.name);
                }
            });
            
            // 4. First set the sorted data
            setFilteredData(dataToSort);
            
            // 5. Then update the sort order in a separate operation
            setSortOrder(newSortOrder);
        } catch (error) {
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
            {!hasActiveApiKey && (
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

                {/* Search input and buttons in one line */}
                <div className="search-container" ref={searchContainerRef}>
                    <div className="search-input-with-buttons">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={getPlaceholderText()}
                            className="search-input-field"
                            disabled={!hasActiveApiKey}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    
                                    // Directly implement search here to match the button
                                    if (!searchQuery.trim()) {
                                        setFilteredData(countryData);
                                        return;
                                    }
                                    if (!hasActiveApiKey) {
                                        setError('No active API key found. Please generate an API key in Settings.');
                                        return;
                                    }
                                    
                                    setLoading(true);
                                    setError('');
                                    
                                    try {
                                        const query = searchQuery.toLowerCase().trim();
                                        let results = [];
                                        
                                        // Filter based on search mode
                                        if (searchMode === 'currency') {
                                            results = countryData.filter(country => {
                                                const currencyName = country.currency?.name?.toLowerCase() || '';
                                                const currencyCode = country.currency?.code?.toLowerCase() || '';
                                                const currencySymbol = country.currency?.symbol?.toLowerCase() || '';
                                                return currencyName.includes(query) || 
                                                       currencyCode.includes(query) || 
                                                       currencySymbol.includes(query);
                                            });
                                        } else if (searchMode === 'language') {
                                            results = countryData.filter(country => 
                                                country.languages.some(lang => 
                                                    lang.toLowerCase().includes(query)
                                                )
                                            );
                                        } else {
                                            results = countryData.filter(country => 
                                                country.name.toLowerCase().includes(query)
                                            );
                                        }
                                        
                                        // Sort the results in current order
                                        results.sort((a, b) => {
                                            return sortOrder === 'asc' 
                                                ? a.name.localeCompare(b.name)
                                                : b.name.localeCompare(a.name);
                                        });
                                        
                                        setFilteredData(results);
                                    } catch (err) {
                                        setError('Failed to search countries');
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }}
                        />
                        
                        {/* All buttons in one row */}
                        <div className="button-row">
                            <button 
                                type="button"
                                onClick={(e) => {
                                    // Direct implementation to avoid any cross-function calls
                                    e.stopPropagation(); // Stop any event bubbling
                                    
                                    if (!searchQuery.trim()) {
                                        setFilteredData(countryData);
                                        return;
                                    }
                                    if (!hasActiveApiKey) {
                                        setError('No active API key found. Please generate an API key in Settings.');
                                        return;
                                    }
                                    
                                    setLoading(true);
                                    setError('');
                                    
                                    try {
                                        const query = searchQuery.toLowerCase().trim();
                                        let results = [];
                                        
                                        // Filter based on search mode
                                        if (searchMode === 'currency') {
                                            results = countryData.filter(country => {
                                                const currencyName = country.currency?.name?.toLowerCase() || '';
                                                const currencyCode = country.currency?.code?.toLowerCase() || '';
                                                const currencySymbol = country.currency?.symbol?.toLowerCase() || '';
                                                return currencyName.includes(query) || 
                                                       currencyCode.includes(query) || 
                                                       currencySymbol.includes(query);
                                            });
                                        } else if (searchMode === 'language') {
                                            results = countryData.filter(country => 
                                                country.languages.some(lang => 
                                                    lang.toLowerCase().includes(query)
                                                )
                                            );
                                        } else {
                                            results = countryData.filter(country => 
                                                country.name.toLowerCase().includes(query)
                                            );
                                        }
                                        
                                        // Sort the results in current order
                                        results.sort((a, b) => {
                                            return sortOrder === 'asc' 
                                                ? a.name.localeCompare(b.name)
                                                : b.name.localeCompare(a.name);
                                        });
                                        
                                        setFilteredData(results);
                                    } catch (err) {
                                        setError('Failed to search countries');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading || !hasActiveApiKey}
                            >
                                {loading ? 'Searching...' : 'SEARCH'}
                            </button>
                            
                            {(searchQuery || (filteredData && countryData && filteredData.length !== countryData.length)) && (
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilteredData(countryData);
                                        hideDropdown();
                                    }}
                                    disabled={!hasActiveApiKey}
                                    className="btn-secondary"
                                >
                                    SHOW ALL
                                </button>
                            )}
                            
                            {filteredData && filteredData.length > 0 && (
                                <button 
                                    type="button" 
                                    className="btn-secondary"
                                    onClick={handleSort}
                                >
                                    {sortOrder === 'asc' ? 'A TO Z ↓' : 'Z TO A ↑'}
                                </button>
                            )}
                        </div>
                    </div>
                    
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
                <div className="results-counter">
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