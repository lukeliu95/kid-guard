// Promise-based wrapper over chrome.runtime.sendMessage and a small router
// factory used by the service worker.

/**
 * Send a typed message to the service worker and resolve with its reply.
 * Reply shape: { ok: true, data } | { ok: false, error }.
 * @param {string} type
 * @param {unknown} [payload]
 * @returns {Promise<{ ok: boolean, data?: unknown, error?: string }>}
 */
export async function send(type, payload = undefined) {
  try {
    const reply = await chrome.runtime.sendMessage({ type, payload });
    if (!reply || typeof reply !== "object") {
      return { ok: false, error: "EMPTY_REPLY" };
    }
    return reply;
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

/**
 * Build a chrome.runtime.onMessage listener from a routes map.
 * Each handler receives (payload, sender) and may return a Promise<data>.
 * Errors thrown become { ok: false, error: err.message }.
 * @param {Record<string, (payload: any, sender: chrome.runtime.MessageSender) => Promise<unknown> | unknown>} routes
 * @returns {(msg: any, sender: chrome.runtime.MessageSender, sendResponse: (reply: any) => void) => boolean}
 */
export function makeRouter(routes) {
  return function listener(msg, sender, sendResponse) {
    if (!msg || typeof msg.type !== "string") {
      sendResponse({ ok: false, error: "BAD_MESSAGE" });
      return false;
    }
    const handler = routes[msg.type];
    if (!handler) {
      sendResponse({ ok: false, error: "UNKNOWN_TYPE" });
      return false;
    }
    Promise.resolve()
      .then(() => handler(msg.payload, sender))
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => {
        const message = err && err.message ? err.message : String(err);
        sendResponse({ ok: false, error: message });
      });
    // Return true so Chrome keeps the message channel open for async reply.
    return true;
  };
}
