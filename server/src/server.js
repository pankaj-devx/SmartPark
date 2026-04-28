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


import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';


async function startServer() {
  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log(`SmartPark API listening on port ${env.PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start SmartPark API');
  console.error(error);
  process.exit(1);
});

