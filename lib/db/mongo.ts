import { MongoClient, ServerApiVersion } from 'mongodb';

if (!process.env.MONGO_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGO_URI"');
}

const uri = process.env.MONGO_URI;
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 30000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
};

// MongoDB 7.x auto-connects on first operation — no need for eager .connect().
// Storing a client instance (not a promise) avoids the "cached rejected promise"
// bug where a single transient connection failure permanently breaks the app.
let client: MongoClient;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
  }
  client = globalWithMongo._mongoClient;
} else {
  // In production mode, use a global variable to prevent orphaned clients
  // from module re-evaluation (worker restarts, route bundle splitting).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
  }
  client = globalWithMongo._mongoClient;
}

// Utility function to get a collection.
export async function dbc(collectionName: string) {
  const db = client.db();
  return db.collection(collectionName);
}

// Export the client for flexibility.
export default client;
