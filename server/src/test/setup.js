/**
 * Integration test DB lifecycle helpers.
 *
 * Usage in a vitest test file:
 *
 *   import { setupTestDB, teardownTestDB, clearCollections } from './setup.js';
 *
 *   beforeAll(setupTestDB);
 *   afterAll(teardownTestDB);
 *   afterEach(clearCollections);  // optional — reset state between tests
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// JWT secrets required by auth controllers — set before any route import resolves
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

let mongoServer;

/**
 * Spin up an in-memory MongoDB and connect Mongoose to it.
 * Call in `beforeAll`.
 */
export async function setupTestDB() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}

/**
 * Drop the test DB, close the Mongoose connection, and stop the in-memory server.
 * Call in `afterAll`.
 */
export async function teardownTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) await mongoServer.stop();
}

/**
 * Delete all documents from every collection without dropping the collection itself.
 * Useful in `afterEach` to keep tests isolated without the overhead of a full
 * teardown/setup cycle.
 */
export async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
