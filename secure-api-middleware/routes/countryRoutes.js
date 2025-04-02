/**
 * Country Data Routes Module
 * Endpoints for accessing country information. All require API key.
 */
const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');
const apiKeyVerifier = require('../middleware/apiKeyVerifier');

// All routes require valid API key in x-api-key header
router.get('/all', apiKeyVerifier, countryController.getAllCountries);       // Get all countries
router.get('/search/:query', apiKeyVerifier, countryController.searchCountries); // Search by name

module.exports = router; 