import mongoose from 'mongoose';

export async function connectDb(uri: string, dbName?: string): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  // sanitizeFilter turns query values like { $ne: ... } into literal values, blocking NoSQL operator injection.
  mongoose.set('sanitizeFilter', true);
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, ...(dbName ? { dbName } : {}) });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
