const COPY_COMMAND = "copy-page-address";

let copyQueue = Promise.resolve();

const enqueueCopy = (task) => {
  copyQueue = copyQueue.then(task, task).catch(() => {});
};

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

const iconPaths = (name) => ({
  16: `icons/${name}16.png`,
  32: `icons/${name}32.png`,
  48: `icons/${name}48.png`,
  128: `icons/${name}128.png`,
});

const LIGHT_ICON = iconPaths("icon");
const DARK_ICON = iconPaths("dark");
const SUCCESS_LIGHT_ICON = iconPaths("success");
const SUCCESS_DARK_ICON = iconPaths("success-dark");

let darkTheme = false;
let showingCopied = false;

const restingIcon = () => (darkTheme ? DARK_ICON : LIGHT_ICON);
const copiedIcon = () => (darkTheme ? SUCCESS_DARK_ICON : SUCCESS_LIGHT_ICON);

const applyIcon = async (path) => {
  await chrome.action.setIcon({ path });
};

const ensureOffscreen = async () => {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [
      chrome.offscreen.Reason.CLIPBOARD,
      chrome.offscreen.Reason.MATCH_MEDIA,
    ],
    justification:
      "Write the page address to the clipboard and match the toolbar icon to the browser theme.",
  });
};

const readColorScheme = async () => {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await ensureOffscreen();
      const response = await chrome.runtime.sendMessage({
        target: "offscreen",
        type: "color-scheme",
      });
      if (response?.ok) {
        darkTheme = Boolean(response.dark);
        return;
      }
      throw new Error(response?.error || "Could not read the color scheme");
    } catch (error) {
      lastError = error;
      if (!isConnectionError(error) || attempt === 4) break;
      await delay(40 * (attempt + 1));
    }
  }
  throw lastError;
};

const applyThemeIcon = () => {
  readColorScheme()
    .then(() => applyIcon(showingCopied ? copiedIcon() : restingIcon()))
    .catch(() => {});
};

applyThemeIcon();
chrome.runtime.onStartup.addListener(applyThemeIcon);
chrome.runtime.onInstalled.addListener(applyThemeIcon);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.target !== "background" || message?.type !== "color-scheme") return;
  darkTheme = Boolean(message.dark);
  applyIcon(showingCopied ? copiedIcon() : restingIcon());
});

const flashBadge = async (text, color) => {
  await applyIcon(restingIcon());
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  await delay(1200);
  await chrome.action.setBadgeText({ text: "" });
};

const showCopied = async () => {
  showingCopied = true;
  await chrome.action.setBadgeText({ text: "" });
  await applyIcon(copiedIcon());
  await delay(2500);
  showingCopied = false;
  await applyIcon(restingIcon());
};

const tabUrl = async (tab) => {
  const direct = tab?.url || tab?.pendingUrl;
  if (direct || tab?.id == null) return direct ?? "";

  try {
    const fresh = await chrome.tabs.get(tab.id);
    return fresh.url || fresh.pendingUrl || "";
  } catch {
    return "";
  }
};

class ClipboardDocument {
  static async open() {
    await ensureOffscreen();
    return new ClipboardDocument();
  }

  async write(text) {
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

  // Keep the document open so it can watch the browser theme.
  async [Symbol.asyncDispose]() {}
}

const writeClipboard = async (text) => {
  await using clipboard = await ClipboardDocument.open();
  await clipboard.write(text);
};

const copyTab = async (tab) => {
  const url = await tabUrl(tab);
  if (!url) {
    await flashBadge("!", "#8C3A3A");
    return;
  }

  try {
    await writeClipboard(url);
    await showCopied();
  } catch {
    await flashBadge("!", "#8C3A3A");
  }
};

const copyActiveTab = async () => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    await copyTab(tab);
  } catch {
    await flashBadge("!", "#8C3A3A");
  }
};

chrome.commands.onCommand.addListener((command) => {
  if (command === COPY_COMMAND) enqueueCopy(copyActiveTab);
});

chrome.action.onClicked.addListener((tab) => {
  enqueueCopy(() => copyTab(tab));
});
