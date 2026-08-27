import dns from 'node:dns';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? '';

// Node's DNS resolver (c-ares) sometimes can't complete SRV lookups against
// a network's own DNS server (e.g. a corporate/VPN resolver), even though
// the OS resolver handles the same query fine. Atlas's mongodb+srv://
// connection strings require SRV support, so fall back to a public resolver
// for Node's own lookups when that happens.
dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function connectToDatabase(): Promise<void> {
  if (!MONGODB_URI) {
    console.warn('[db] MONGODB_URI not set — running with in-memory storage only (data will not persist).');
    return;
  }
  await mongoose.connect(MONGODB_URI);
  console.log('[db] Connected to MongoDB');
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
