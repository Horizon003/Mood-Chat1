// ============================================================================
//  MOODCHAT — Netlify serverless function: sendNotification
//  Sends a Web Push via the OneSignal REST API.
//
//  The REST API key is SECRET and is read from an environment variable.
//  NEVER hardcode it here or in index.html.
//
//  Set these env vars in Netlify (Site settings -> Environment variables):
//    ONESIGNAL_APP_ID         = 0e5b7061-29ed-4647-acc7-f032f75e4f09
//    ONESIGNAL_REST_API_KEY   = (the os_v2_app_... key — keep secret!)
//
//  Optional (to skip push when the receiver is already active in the chat):
//    FIREBASE_DATABASE_URL    = https://moodchat-f13a0-default-rtdb.firebaseio.com
//
//  Request body (POST JSON):
//    { receiverUid, title, body, chatId, senderId, type }
//
//  Endpoint (after deploy):
//    https://YOUR-SITE.netlify.app/.netlify/functions/sendNotification
// ============================================================================

const ONESIGNAL_APP_ID       = process.env.ONESIGNAL_APP_ID || "0e5b7061-29ed-4647-acc7-f032f75e4f09";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY; // REQUIRED, secret
const FIREBASE_DATABASE_URL  = process.env.FIREBASE_DATABASE_URL  || "https://moodchat-f13a0-default-rtdb.firebaseio.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST")
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };

  if (!ONESIGNAL_REST_API_KEY)
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server missing ONESIGNAL_REST_API_KEY" }) };

  let data;
  try { data = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  const { receiverUid, title, body, chatId, senderId, type } = data;
  if (!receiverUid)
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "receiverUid required" }) };

  // --- Optional: skip push if the receiver is online AND active in this same chat ---
  try {
    const presRes = await fetch(`${FIREBASE_DATABASE_URL}/status/${receiverUid}.json`);
    if (presRes.ok) {
      const pres = await presRes.json();
      if (pres && pres.state === "online" && chatId && pres.activeChatId === chatId) {
        return { statusCode: 200, headers: cors, body: JSON.stringify({ skipped: true, reason: "receiver active in chat" }) };
      }
    }
  } catch (_) { /* presence check is best-effort */ }

  // --- Build the OneSignal payload, targeting the receiver by external_id (their uid) ---
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: { external_id: [String(receiverUid)] },
    target_channel: "push",
    headings: { en: title || "MOODCHAT" },
    contents: { en: body || "New message" },
    data: { chatId: chatId || "", senderId: senderId || "", type: type || "message" },
    // Clicking the notification opens the app (Netlify URL). Adjust if you use a custom domain.
    web_url: "https://gensgithub.netlify.app/"
  };

  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    return { statusCode: res.ok ? 200 : res.status, headers: cors, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
