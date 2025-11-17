import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Parse the URI to extract database name for logging
    let dbName = 'default';
    try {
      const url = new URL(mongoUri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
      const pathname = url.pathname;
      if (pathname && pathname.length > 1) {
        dbName = pathname.substring(1).split('?')[0];
      }
    } catch (e) {
      // If parsing fails, try to extract from connection string directly
      const match = mongoUri.match(/\/([^?\/]+)(\?|$)/);
      if (match) {
        dbName = match[1];
      }
    }
    
    console.log(`🔗 Connecting to MongoDB...`);
    console.log(`📍 Database: ${dbName || 'default'}`);
    
    const conn = await mongoose.connect(mongoUri);
    
    const connectedDbName = conn.connection.name;
    console.log(`✅ MongoDB Connected:`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${connectedDbName}`);
    console.log(`   Collections: ${Object.keys(conn.connection.collections).length} collections available`);
    
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connectDB;

