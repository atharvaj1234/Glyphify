// database.js
import { openDatabaseAsync } from 'expo-sqlite'; // Correct import for the async function

const databaseName = 'glyphify.db';
let db = null; // Will store the resolved database object after initDb runs

export const initDb = async () => {
  try {
    if (db === null) {
      db = await openDatabaseAsync(databaseName); // AWAIT THE DATABASE OPENING
      console.log('Database opened successfully.');
    }

    // Use db.execAsync for CREATE TABLE and PRAGMA statements
    // This method executes multiple SQL statements.
    await db.execAsync(`
      PRAGMA journal_mode = WAL; -- Recommended for performance
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        processedDate TEXT NOT NULL,
        processedContent TEXT NOT NULL,
        outputType TEXT NOT NULL,
        originalFileUri TEXT
      );
    `);
    console.log('Table created or already exists.');
  } catch (error) {
    console.error('Error initializing database or table:', error);
    throw error; // Re-throw to be caught in App.js
  }
};


export const addDocumentToHistory = async (title, processedContent, outputType, originalFileUri = null) => {
  if (!db) {
    console.error('Database not initialized for addDocumentToHistory');
    throw new Error('Database not initialized.');
  }
  try {
    const processedDate = new Date().toISOString();
    // Use db.runAsync for INSERT, UPDATE, DELETE operations
    const result = await db.runAsync(
      `INSERT INTO history (title, processedDate, processedContent, outputType, originalFileUri) VALUES (?, ?, ?, ?, ?);`,
      [title, processedDate, processedContent, outputType, originalFileUri]
    );
    console.log('Document added to history:', result.lastInsertRowId);
    return result.lastInsertRowId; // Return the ID of the new row
  } catch (error) {
    console.error('Error adding document to history:', error);
    throw error;
  }
};

export const getHistoryDocuments = async () => {
  if (!db) {
    console.error('Database not initialized for getHistoryDocuments');
    throw new Error('Database not initialized.');
  }
  try {
    // Use db.getAllAsync for SELECT queries that return multiple rows
    const allRows = await db.getAllAsync(`SELECT * FROM history ORDER BY processedDate DESC;`);
    console.log('Fetched history documents:', allRows);
    return allRows;
  } catch (error) {
    console.error('Error fetching history documents:', error);
    throw error;
  }
};

export const updateDocumentTitle = async (id, newTitle) => {
  if (!db) {
    console.error('Database not initialized for updateDocumentTitle');
    throw new Error('Database not initialized.');
  }
  try {
    // Use db.runAsync for UPDATE operations
    const result = await db.runAsync(
      `UPDATE history SET title = ? WHERE id = ?;`,
      [newTitle, id]
    );
    if (result.changes > 0) { // Check result.changes for rows affected
      console.log(`Document ID ${id} title updated to: ${newTitle}`);
      return true;
    } else {
      console.warn(`No document found with ID ${id} to update.`);
      return false;
    }
  } catch (error) {
    console.error('Error updating document title:', error);
    throw error;
  }
};

export const deleteDocument = async (id) => {
  if (!db) {
    console.error('Database not initialized for deleteDocument');
    throw new Error('Database not initialized.');
  }
  try {
    // Use db.runAsync for DELETE operations
    const result = await db.runAsync(
      `DELETE FROM history WHERE id = ?;`,
      [id]
    );
    if (result.changes > 0) { // Check result.changes for rows affected
      console.log(`Document ID ${id} deleted.`);
      return true;
    } else {
      console.warn(`No document found with ID ${id} to delete.`);
      return false;
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};