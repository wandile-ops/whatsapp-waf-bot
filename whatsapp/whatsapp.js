const axios = require("axios");

const GRAPH_VERSION =
  process.env.META_GRAPH_VERSION || "v25.0";

const ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN;

const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID;


function getMessagesUrl() {

  if (!ACCESS_TOKEN) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN is missing."
    );
  }

  if (!PHONE_NUMBER_ID) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID is missing."
    );
  }

  return `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;
}


// ============================================================
// GENERIC REQUEST
// ============================================================

async function sendWhatsAppMessage(payload) {

  const response = await axios.post(
    getMessagesUrl(),
    payload,
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    }
  );

  return response.data;
}


// ============================================================
// TEXT
// ============================================================

async function sendText(to, text) {

  return sendWhatsAppMessage({
    messaging_product: "whatsapp",

    recipient_type: "individual",

    to,

    type: "text",

    text: {
      preview_url: true,
      body: text
    }
  });
}


// ============================================================
// BUTTONS
// ============================================================

async function sendButtons(
  to,
  body,
  buttons
) {

  const formattedButtons =
    buttons.slice(0, 3).map((button) => ({
      type: "reply",

      reply: {
        id: button.id,
        title: button.title.substring(0, 20)
      }
    }));

  return sendWhatsAppMessage({

    messaging_product: "whatsapp",

    recipient_type: "individual",

    to,

    type: "interactive",

    interactive: {

      type: "button",

      body: {
        text: body
      },

      action: {
        buttons: formattedButtons
      }
    }
  });
}


// ============================================================
// LIST
// ============================================================

async function sendList(
  to,
  body,
  buttonText,
  rows
) {

  const formattedRows =
    rows.slice(0, 10).map((row) => ({

      id: row.id,

      title:
        row.title.substring(0, 24),

      description:
        row.description
          ? row.description.substring(0, 72)
          : undefined
    }));

  return sendWhatsAppMessage({

    messaging_product: "whatsapp",

    recipient_type: "individual",

    to,

    type: "interactive",

    interactive: {

      type: "list",

      body: {
        text: body
      },

      action: {

        button:
          buttonText.substring(0, 20),

        sections: [
          {
            title: "Options",

            rows: formattedRows
          }
        ]
      }
    }
  });
}


// ============================================================
// MARK MESSAGE AS READ
// ============================================================

async function markAsRead(messageId) {

  return sendWhatsAppMessage({

    messaging_product: "whatsapp",

    status: "read",

    message_id: messageId
  });
}


module.exports = {
  sendWhatsAppMessage,
  sendText,
  sendButtons,
  sendList,
  markAsRead
};