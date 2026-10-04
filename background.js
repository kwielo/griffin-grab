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

const prefersDark = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-color-scheme: dark)").matches;

const restingIcon = () => (prefersDark() ? DARK_ICON : LIGHT_ICON);
const copiedIcon = () => (prefersDark() ? SUCCESS_DARK_ICON : SUCCESS_LIGHT_ICON);

let showingCopied = false;
let iconOverridden = false;

const applyIcon = async (path) => {
  iconOverridden = true;
  await chrome.action.setIcon({ path });
};

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

if (typeof matchMedia === "function") {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (!iconOverridden) return;
    chrome.action.setIcon({
      path: showingCopied ? copiedIcon() : restingIcon(),
    });
  });
}

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
    if (!(await chrome.offscreen.hasDocument())) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: [chrome.offscreen.Reason.CLIPBOARD],
        justification: "Write the current page address to the clipboard.",
      });
    }
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

  async [Symbol.asyncDispose]() {
    if (await chrome.offscreen.hasDocument()) {
      await chrome.offscreen.closeDocument();
    }
  }
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
