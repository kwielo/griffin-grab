const textEl = document.querySelector("#text");

const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isConnectionError = (error) => {
  const message = String(error?.message ?? error);
  return (
    message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection")
  );
};

const postBackground = async (message) => {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await chrome.runtime.sendMessage({ target: "background", ...message });
      return;
    } catch (error) {
      lastError = error;
      if (!isConnectionError(error) || attempt === 4) break;
      await delay(40 * (attempt + 1));
    }
  }
  throw lastError;
};

const colorScheme = () => matchMedia("(prefers-color-scheme: dark)");

let reporting = false;
let reportedDark = null;

const reportColorScheme = () => {
  if (reporting) return;
  const dark = colorScheme().matches;
  if (dark === reportedDark) return;
  reporting = true;
  postBackground({ type: "color-scheme", dark })
    .then(() => {
      if (colorScheme().matches === dark) reportedDark = dark;
    })
    .catch(() => {})
    .finally(() => {
      reporting = false;
    });
};

const copy = async (text) => {
  textEl.value = text;
  textEl.select();
  if (document.execCommand("copy")) return;
  await navigator.clipboard.writeText(text);
};

// This page is hidden, so the change event does not arrive when the
// browser theme changes. Reading the query still sees the new value.
colorScheme().addEventListener("change", reportColorScheme);
setInterval(reportColorScheme, 2000);
reportColorScheme();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen") return;

  if (message.type === "color-scheme") {
    sendResponse({ ok: true, dark: colorScheme().matches });
    return;
  }

  if (message.type !== "copy") return;

  copy(String(message.text ?? ""))
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: Error.isError(error) ? error.message : String(error),
      });
    });

  return true;
});
