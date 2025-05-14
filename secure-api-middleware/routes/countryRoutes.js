/**
 * Country Routes Module
 * Defines routes for accessing country data
 */
const express = require("express");
const router = express.Router();
const countryController = require("../controllers/countryController");
const apiKeyVerifier = require("../middleware/apiKeyVerifier");

// Public routes
router.get("/", countryController.getAllCountries);
router.get("/search", countryController.searchCountries);
router.get("/stats", countryController.getCountriesWithPostCounts);
router.get("/name/:name", countryController.getCountryByName);

// API Key protected routes
router.get("/api", apiKeyVerifier, countryController.getAllCountries);
router.get("/api/search", apiKeyVerifier, countryController.searchCountries);
router.get("/api/stats", apiKeyVerifier, countryController.getCountriesWithPostCounts);
router.get("/api/name/:name", apiKeyVerifier, countryController.getCountryByName);

module.exports = router; 