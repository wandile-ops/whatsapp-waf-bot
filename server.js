require("dotenv").config();

const express = require("express");

const { db } = require("./config/firebase");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "WAF WhatsApp Bot is running",
    environment: process.env.NODE_ENV || "development",
  });
});

/*
|--------------------------------------------------------------------------
| WHATSAPP WEBHOOK VERIFICATION
|--------------------------------------------------------------------------
|
| Meta sends a GET request when you configure the webhook.
|
*/

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("WhatsApp webhook verification request received.");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    console.log("WhatsApp webhook verified successfully.");

    return res.status(200).send(challenge);
  }

  console.error("WhatsApp webhook verification failed.");

  return res.sendStatus(403);
});

/*
|--------------------------------------------------------------------------
| WHATSAPP WEBHOOK
|--------------------------------------------------------------------------
|
| Meta sends incoming WhatsApp messages here.
|
*/

app.post("/webhook", async (req, res) => {
  try {
    console.log("");
    console.log("==========================================");
    console.log("WHATSAPP MESSAGE RECEIVED");
    console.log("==========================================");

    console.log(JSON.stringify(req.body, null, 2));

    /*
     * Acknowledge Meta immediately.
     *
     * Meta expects a 200 response quickly.
     */
    res.sendStatus(200);

    /*
     * We will process the message here.
     *
     * The next step will connect this to:
     *
     * bot/handler.js
     * bot/conversation.js
     * bot/flow.js
     */
  } catch (error) {
    console.error("Webhook error:", error);

    /*
     * If the response hasn't already been sent,
     * return a 500 error.
     */
    if (!res.headersSent) {
      res.sendStatus(500);
    }
  }
});

/*
|--------------------------------------------------------------------------
| FIREBASE TEST ENDPOINT
|--------------------------------------------------------------------------
|
| Temporary diagnostic endpoint.
| We can remove this after everything is working.
|
*/

app.get("/firebase-test", async (req, res) => {
  try {
    const testRef = db.collection("activities").doc();

    await testRef.set({
      type: "whatsapp_bot_test",
      source: "whatsapp",
      message: "WhatsApp bot is connected to Firebase",
      createdAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Firebase connection successful",
      documentId: testRef.id,
    });
  } catch (error) {
    console.error("Firebase test failed:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
  console.log("");
  console.log("==========================================");
  console.log("WAF WHATSAPP BOT");
  console.log("==========================================");
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("");
  console.log("Endpoints:");
  console.log(`GET  /`);
  console.log(`GET  /webhook`);
  console.log(`POST /webhook`);
  console.log(`GET  /firebase-test`);
  console.log("==========================================");
});