import dns from "dns";

if (process.env.NODE_ENV==="development") {

dns.setServers([
"8.8.8.8",
"8.8.4.4"
]);

dns.setDefaultResultOrder(
"ipv4first"
);

}


import { createServer } from 'http';
import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { initSocket } from './config/socket.js';
import { seedDefaultParkings } from './utils/seedDefaultParkings.js';


async function startServer() {
  await connectDatabase();
  await seedDefaultParkings();

  // Create a plain HTTP server so Socket.IO can share the same port
  const httpServer = createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`SmartPark API listening on port ${env.PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start SmartPark API');
  console.error(error);
  process.exit(1);
});

