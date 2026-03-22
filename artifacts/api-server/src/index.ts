// Config MUST be imported first — validates all required env vars before anything else loads
import { config } from "./config";
import app from "./app";

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
