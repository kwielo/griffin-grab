const COPY_COMMAND = "copy-page-address";

let copyQueue = Promise.resolve();

chrome.commands.onCommand.addListener((command) => {
  if (command !== COPY_COMMAND) return;
  enqueueCopy(copyActiveTab);
});

chrome.action.onClicked.addListener((tab) => {
  enqueueCopy(() => copyTab(tab));
});

function enqueueCopy(task) {
  copyQueue = copyQueue.then(task, task).catch(() => {});
}

async function copyActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    await copyTab(tab);
  } catch {
    await flashBadge("!", "#8C3A3A");
  }
}

async function copyTab(tab) {
  const url = await tabUrl(tab);
  if (!url) {
    await flashBadge("!", "#8C3A3A");
    return;
  }

  try {
    await writeClipboard(url);
    await flashBadge("OK", "#1B6B58");
  } catch {
    await flashBadge("!", "#8C3A3A");
  }
}

async function tabUrl(tab) {
  const direct = tab?.url || tab?.pendingUrl;
  if (direct || tab?.id == null) return direct || "";

  try {
    const fresh = await chrome.tabs.get(tab.id);
    return fresh.url || fresh.pendingUrl || "";
  } catch {
    return "";
  }
}

async function writeClipboard(text) {
  await ensureOffscreen();
  try {
    await sendCopy(text);
  } finally {
    await closeOffscreen();
  }
}

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: "Write the current page address to the clipboard.",
  });
}

async function closeOffscreen() {
  if (!(await chrome.offscreen.hasDocument())) return;
  await chrome.offscreen.closeDocument();
}

async function sendCopy(text) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await chrome.runtime.sendMessage({
        target: "offscreen",
        type: "copy",
        text,
      });
      if (response?.ok) return;
      throw new Error(response?.error || "Clipboard write failed");
    } catch (error) {
      lastError = error;
      if (!isConnectionError(error) || attempt === 4) break;
      await delay(40 * (attempt + 1));
    }
  }
  throw lastError;
}

function isConnectionError(error) {
  const message = String(error?.message || error);
  return (
    message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection")
  );
}

async function flashBadge(text, color) {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  await delay(1200);
  await chrome.action.setBadgeText({ text: "" });
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
