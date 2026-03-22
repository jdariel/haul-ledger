// Config MUST be imported first — validates all required env vars before anything else loads
import { config } from "./config";
// Sentry MUST be initialized before any other imports so it can instrument all modules
import { initSentry } from "./lib/sentry";
initSentry();

import app from "./app";
import { startScheduler } from "./scheduler";

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
  startScheduler();
});
