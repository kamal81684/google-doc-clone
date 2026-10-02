// Must stay the first import: imports are hoisted, and config modules read process.env on load
import "dotenv/config";

import app from "./app";
import { setupWebSocket } from "./websocket";
import { createServer } from "http";

const PORT = process.env.PORT || 5000;

const server = createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
    console.log(`Server Running on Port ${PORT}`);
});