import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/otzaria_db'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

// Initialize global cache if not exists
let cached = global.mongoose
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

/**
 * Connect to MongoDB with connection pooling and caching
 * @returns {Promise<Object>} Mongoose connection
 */
async function connectDB() {
  // Return existing connection if available
  if (cached.conn) {
    return cached.conn
  }

  // Create new connection promise if not exists
  if (!cached.promise) {
    const connectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 5,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }

    cached.promise = mongoose
      .connect(MONGODB_URI, connectOptions)
      .then((mongoose) => {
        return mongoose
      })
      .catch((error) => {
        console.error('❌ MongoDB Connection Error:', error.message)
        cached.promise = null // Reset promise on error
        throw error
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (error) {
    cached.promise = null // Reset promise on error
    throw new Error(`Database connection failed: ${error.message}`)
  }

  return cached.conn
}

export default connectDB