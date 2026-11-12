// Must stay the first import: imports are hoisted, and config modules read process.env on load
import "dotenv/config";

import app from "./app";
import { setupWebSocket } from "./websocket";
import { createServer } from "http";
import { getMailer, isMailEnabled } from "./config/mailer";

const PORT = process.env.PORT || 5000;

const server = createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
    console.log(`Server Running on Port ${PORT}`);

    if (isMailEnabled()) {
        getMailer()
            .verify()
            .then(() => console.log(`SMTP ready (${process.env.SMTP_HOST})`))
            .catch((error) => console.error("SMTP connection failed, share emails won't send:", error.message));
    } else {
        console.log("SMTP not configured, share emails are disabled");
    }
});