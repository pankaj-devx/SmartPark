
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  if (env.NODE_ENV === 'test' || env.SKIP_DB_CONNECT) {
    console.log('MongoDB connection skipped');
    return;
  }

  mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
  });

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error', error);
  });
 
  await mongoose.connect(env.MONGODB_URI);
}
