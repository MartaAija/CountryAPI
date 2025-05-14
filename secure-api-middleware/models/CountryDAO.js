/**
 * Country Data Access Object
 * Handles all database operations related to countries
 */
const BaseDAO = require('./BaseDAO');

class CountryDAO extends BaseDAO {
  constructor() {
    super('countries');
  }

  /**
   * Get all countries
   * @returns {Promise<Array>} - Array of countries
   */
  async getAllCountries() {
    try {
      const [rows] = await this.pool.query(
        'SELECT id, name, code FROM countries ORDER BY name'
      );
      return rows;
    } catch (error) {
      console.error('Error in CountryDAO.getAllCountries:', error);
      throw error;
    }
  }

  /**
   * Search countries by name
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Array of matching countries
   */
  async searchCountries(searchTerm) {
    try {
      const [rows] = await this.pool.query(
        'SELECT id, name, code FROM countries WHERE name LIKE ? ORDER BY name',
        [`%${searchTerm}%`]
      );
      return rows;
    } catch (error) {
      console.error('Error in CountryDAO.searchCountries:', error);
      throw error;
    }
  }

  /**
   * Get a country by name
   * @param {string} name - Country name
   * @returns {Promise<Object|null>} - Country object or null
   */
  async getCountryByName(name) {
    try {
      const [rows] = await this.pool.query(
        'SELECT id, name, code FROM countries WHERE name = ?',
        [name]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Error in CountryDAO.getCountryByName:', error);
      throw error;
    }
  }

  /**
   * Get or create a country by name
   * @param {string} name - Country name
   * @returns {Promise<Object>} - Country object with ID
   */
  async getOrCreateCountry(name) {
    try {
      // Try to find existing country
      const country = await this.getCountryByName(name);
      if (country) {
        return country;
      }
      
      // Create new country
      const code = name.substring(0, 3).toUpperCase();
      const [result] = await this.pool.query(
        'INSERT INTO countries (name, code) VALUES (?, ?)',
        [name, code]
      );
      
      return {
        id: result.insertId,
        name,
        code
      };
    } catch (error) {
      console.error('Error in CountryDAO.getOrCreateCountry:', error);
      throw error;
    }
  }

  /**
   * Get countries with post counts
   * @returns {Promise<Array>} - Array of countries with post counts
   */
  async getCountriesWithPostCounts() {
    try {
      const [rows] = await this.pool.query(`
        SELECT 
          c.id, c.name, c.code,
          COUNT(bp.id) as post_count
        FROM countries c
        LEFT JOIN blog_posts bp ON c.id = bp.country_id
        GROUP BY c.id, c.name, c.code
        ORDER BY post_count DESC, c.name ASC
      `);
      return rows;
    } catch (error) {
      console.error('Error in CountryDAO.getCountriesWithPostCounts:', error);
      throw error;
    }
  }
}

module.exports = new CountryDAO(); 