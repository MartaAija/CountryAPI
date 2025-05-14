/**
 * Base Data Access Object (DAO) Class
 * Provides common database operations for all models
 */
const pool = require('../config/db');

class BaseDAO {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
  }

  /**
   * Find a record by ID
   * @param {number} id - The ID of the record to find
   * @returns {Promise<Object|null>} - The found record or null
   */
  async findById(id) {
    try {
      const [rows] = await this.pool.query(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error(`Error in ${this.tableName}.findById:`, error);
      throw error;
    }
  }

  /**
   * Find all records in the table
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>} - Array of records
   */
  async findAll(options = {}) {
    try {
      const { limit, offset, orderBy } = options;
      let query = `SELECT * FROM ${this.tableName}`;
      
      // Add ORDER BY if specified
      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }
      
      // Add LIMIT and OFFSET if specified
      if (limit) {
        query += ` LIMIT ?`;
        if (offset) {
          query += ` OFFSET ?`;
        }
      }
      
      const params = [];
      if (limit) params.push(parseInt(limit));
      if (offset) params.push(parseInt(offset));
      
      const [rows] = await this.pool.query(query, params);
      return rows;
    } catch (error) {
      console.error(`Error in ${this.tableName}.findAll:`, error);
      throw error;
    }
  }

  /**
   * Find records by a specific field value
   * @param {string} field - The field to search by
   * @param {any} value - The value to search for
   * @returns {Promise<Array>} - Array of matching records
   */
  async findByField(field, value) {
    try {
      const [rows] = await this.pool.query(
        `SELECT * FROM ${this.tableName} WHERE ${field} = ?`,
        [value]
      );
      return rows;
    } catch (error) {
      console.error(`Error in ${this.tableName}.findByField:`, error);
      throw error;
    }
  }

  /**
   * Create a new record
   * @param {Object} data - The data to insert
   * @returns {Promise<Object>} - The created record with ID
   */
  async create(data) {
    try {
      const fields = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      const [result] = await this.pool.query(
        `INSERT INTO ${this.tableName} (${fields}) VALUES (${placeholders})`,
        values
      );
      
      return {
        id: result.insertId,
        ...data
      };
    } catch (error) {
      console.error(`Error in ${this.tableName}.create:`, error);
      throw error;
    }
  }

  /**
   * Update a record by ID
   * @param {number} id - The ID of the record to update
   * @param {Object} data - The data to update
   * @returns {Promise<boolean>} - True if successful
   */
  async update(id, data) {
    try {
      const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), id];
      
      const [result] = await this.pool.query(
        `UPDATE ${this.tableName} SET ${fields} WHERE id = ?`,
        values
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error in ${this.tableName}.update:`, error);
      throw error;
    }
  }

  /**
   * Delete a record by ID
   * @param {number} id - The ID of the record to delete
   * @returns {Promise<boolean>} - True if successful
   */
  async delete(id) {
    try {
      const [result] = await this.pool.query(
        `DELETE FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error in ${this.tableName}.delete:`, error);
      throw error;
    }
  }

  /**
   * Count total records in the table
   * @param {Object} where - Where conditions
   * @returns {Promise<number>} - Total count
   */
  async count(where = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const params = [];
      
      // Add WHERE conditions if specified
      if (Object.keys(where).length > 0) {
        const conditions = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        query += ` WHERE ${conditions}`;
        params.push(...Object.values(where));
      }
      
      const [rows] = await this.pool.query(query, params);
      return rows[0].total;
    } catch (error) {
      console.error(`Error in ${this.tableName}.count:`, error);
      throw error;
    }
  }

  /**
   * Execute a custom query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} - Query results
   */
  async executeQuery(query, params = []) {
    try {
      const [rows] = await this.pool.query(query, params);
      return rows;
    } catch (error) {
      console.error(`Error in ${this.tableName}.executeQuery:`, error);
      throw error;
    }
  }
}

module.exports = BaseDAO; 