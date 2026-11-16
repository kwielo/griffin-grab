const browser = globalThis.browser;

const COPY_COMMAND = "copy-page-address";
const FAILURE_BADGE = "#8C3A3A";

let copyQueue = Promise.resolve();

const enqueueCopy = (task) => {
  const run = copyQueue.then(task, task);
  copyQueue = run.then(
    () => {},
    () => {},
  );
  return run;
};

const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const iconPaths = (name) => ({
  16: `icons/${name}16.png`,
  32: `icons/${name}32.png`,
  48: `icons/${name}48.png`,
  128: `icons/${name}128.png`,
});

const SUCCESS_LIGHT_ICON = iconPaths("success");
const SUCCESS_DARK_ICON = iconPaths("success-dark");

const parseColor = (input) => {
  if (typeof input !== "string") return null;
  const value = input.trim();
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value);
  if (hex) {
    const raw = hex[1];
    const full =
      raw.length === 3 ? [...raw].map((part) => part + part).join("") : raw;
    return [0, 2, 4].map((index) =>
      Number.parseInt(full.slice(index, index + 2), 16),
    );
  }
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(value);
  if (!rgb) return null;
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
};

const isDarkColor = (input) => {
  const channels = parseColor(input);
  if (!channels) return null;
  const linear = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance < 0.4;
};

const toolbarIsDark = async () => {
  try {
    const theme = await browser.theme.getCurrent();
    const color = theme?.colors?.toolbar || theme?.colors?.frame;
    const dark = isDarkColor(color);
    if (dark != null) return dark;
  } catch {
    // A missing theme still leaves the system color scheme.
  }
  return matchMedia("(prefers-color-scheme: dark)").matches;
};

const formatShortcut = (shortcut) => {
  const mac =
    shortcut.includes("MacCtrl") ||
    shortcut.includes("Command") ||
    shortcut.includes("Option");
  return shortcut
    .split("+")
    .map((part) => {
      if (part === "MacCtrl") return "Control";
      if (part === "Alt" && mac) return "Option";
      return part;
    })
    .join("+");
};

const shortcutTitle = (command) => {
  const action = command.description;
  if (!command.shortcut) return `${action}: no shortcut assigned`;
  return `${action}: ${formatShortcut(command.shortcut)}`;
};

const refreshShortcutMenu = async () => {
  const commands = await browser.commands.getAll();
  const items = commands.filter((command) => command.name && command.description);
  await browser.contextMenus.removeAll();
  await Promise.all(
    items.map((command) =>
      browser.contextMenus.create({
        id: `shortcut-${command.name}`,
        title: shortcutTitle(command),
        contexts: ["action"],
        enabled: false,
      }),
    ),
  );
};

const start = () => refreshShortcutMenu().catch(() => {});

const flashBadge = async () => {
  await browser.action.setBadgeTextColor({ color: "#FFFFFF" });
  await browser.action.setBadgeBackgroundColor({ color: FAILURE_BADGE });
  await browser.action.setBadgeText({ text: "!" });
  await delay(1200);
  await browser.action.setBadgeText({ text: "" });
};

const showCopied = async () => {
  const path = (await toolbarIsDark()) ? SUCCESS_DARK_ICON : SUCCESS_LIGHT_ICON;
  await browser.action.setBadgeText({ text: "" });
  await browser.action.setIcon({ path });
  await delay(2500);
  // Hand the toolbar back to the manifest theme icons.
  await browser.action.setIcon({ path: null });
};

const tabUrl = async (tab) => {
  const direct = tab?.url || tab?.pendingUrl;
  if (direct || tab?.id == null) return direct ?? "";

  try {
    const fresh = await browser.tabs.get(tab.id);
    return fresh.url || fresh.pendingUrl || "";
  } catch {
    return "";
  }
};

const writeClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Fall through. Some Firefox builds still copy from a selected field.
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  const parent = document.body ?? document.documentElement;
  parent.appendChild(field);
  try {
    field.focus();
    field.select();
    if (!document.execCommand("copy")) {
      throw new Error("Clipboard write failed");
    }
  } finally {
    field.remove();
  }
};

const copyTab = async (tab) => {
  const url = await tabUrl(tab);
  if (!url) {
    await flashBadge();
    return;
  }

  try {
    await writeClipboard(url);
    await showCopied();
  } catch {
    await flashBadge();
  }
};

const copyActiveTab = async () => {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    await copyTab(tab);
  } catch {
    await flashBadge();
  }
};

start();
browser.runtime.onStartup.addListener(start);
browser.runtime.onInstalled.addListener(start);
browser.commands.onChanged.addListener(start);

browser.commands.onCommand.addListener((command) => {
  if (command !== COPY_COMMAND) return;
  return enqueueCopy(copyActiveTab).catch(() => {});
});

browser.action.onClicked.addListener((tab) =>
  enqueueCopy(() => copyTab(tab)).catch(() => {}),
);
