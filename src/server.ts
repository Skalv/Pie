import {app, logger} from "./app"

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info("Server running on port " + PORT);
});

