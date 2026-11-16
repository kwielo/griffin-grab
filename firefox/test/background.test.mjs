import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

const state = {
  clipboard: [],
  icons: [],
  badges: [],
  badgeColors: [],
  menus: [],
  commands: [
    {
      name: "copy-page-address",
      description: "Copy the current page address",
      shortcut: "MacCtrl+Command+C",
    },
    { name: "_execute_action", description: "", shortcut: "" },
  ],
  tabs: [],
  theme: {},
  themeError: false,
  colorSchemeDark: false,
  execCommands: [],
  query: null,
};

const listeners = {};

const on = (name) => {
  listeners[name] = [];
  return {
    addListener(fn) {
      listeners[name].push(fn);
    },
  };
};

const clipboard = {
  writeText(text) {
    state.clipboard.push(text);
    return Promise.resolve();
  },
};

Object.defineProperty(globalThis.navigator, "clipboard", {
  configurable: true,
  writable: true,
  value: clipboard,
});

globalThis.browser = {
  action: {
    async setIcon(details) {
      state.icons.push(details);
    },
    async setBadgeText(details) {
      state.badges.push(details.text);
    },
    async setBadgeBackgroundColor(details) {
      state.badgeColors.push(details.color);
    },
    async setBadgeTextColor() {},
    onClicked: on("clicked"),
  },
  commands: {
    async getAll() {
      return state.commands.map((command) => ({ ...command }));
    },
    onCommand: on("command"),
    onChanged: on("commandChanged"),
  },
  contextMenus: {
    async removeAll() {
      state.menus = [];
    },
    async create(item) {
      state.menus.push(item);
      return item.id;
    },
  },
  runtime: {
    onStartup: on("startup"),
    onInstalled: on("installed"),
  },
  tabs: {
    async query(query) {
      state.query = query;
      return state.tabs;
    },
    async get(id) {
      const tab = state.tabs.find((item) => item.id === id);
      if (!tab) throw new Error("No tab");
      return tab;
    },
  },
  theme: {
    async getCurrent() {
      if (state.themeError) throw new Error("theme unavailable");
      return state.theme;
    },
  },
};

globalThis.matchMedia = () => ({ matches: state.colorSchemeDark });

const installDocument = (copied) => {
  globalThis.document = {
    body: { appendChild() {} },
    createElement() {
      return {
        value: "",
        style: {},
        setAttribute() {},
        focus() {},
        select() {},
        remove() {},
      };
    },
    execCommand(command) {
      state.execCommands.push(command);
      return copied;
    },
  };
};

installDocument(false);

const useImmediateTimers = () => {
  const original = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    queueMicrotask(fn);
    return 0;
  };
  return () => {
    globalThis.setTimeout = original;
  };
};

await import("../background.js");

for (let step = 0; step < 30; step += 1) await Promise.resolve();

const resetCopyState = () => {
  state.clipboard.length = 0;
  state.icons.length = 0;
  state.badges.length = 0;
  state.badgeColors.length = 0;
  state.execCommands.length = 0;
  state.theme = {};
  state.themeError = false;
  state.colorSchemeDark = false;
  state.tabs = [];
  state.query = null;
  clipboard.writeText = (text) => {
    state.clipboard.push(text);
    return Promise.resolve();
  };
  installDocument(false);
};

const click = async (tab) => {
  const restore = useImmediateTimers();
  try {
    await listeners.clicked[0](tab);
  } finally {
    restore();
  }
};

describe("Griffin Grab for Firefox", { concurrency: 1 }, () => {
  test("manifest stays local and offers the same shortcut", async () => {
    const manifest = JSON.parse(
      await readFile(new URL("../manifest.json", import.meta.url), "utf8"),
    );
    assert.equal(manifest.version, "1.0.0");
    assert.equal(manifest.author, "Krzysztof Wielogórski <contact@wielo.co>");
    assert.deepEqual(manifest.permissions, [
      "activeTab",
      "clipboardWrite",
      "contextMenus",
    ]);
    assert.equal(manifest.browser_specific_settings.gecko.id, "griffin-grab@wielo.co");
    assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, "140.0");
    assert.deepEqual(
      manifest.browser_specific_settings.gecko.data_collection_permissions.required,
      ["none"],
    );
    assert.equal(manifest.action.default_area, "navbar");
    assert.equal(manifest.action.theme_icons[0].light, "icons/dark16.png");
    assert.equal(manifest.action.theme_icons[0].dark, "icons/icon16.png");
    assert.equal(
      manifest.commands["copy-page-address"].suggested_key.default,
      "Ctrl+Shift+U",
    );
    assert.equal(
      manifest.commands["copy-page-address"].suggested_key.mac,
      "MacCtrl+Command+C",
    );
    assert.deepEqual(manifest.background.scripts, ["background.js"]);
    assert.equal(manifest.background.service_worker, undefined);
    assert.equal(manifest.host_permissions, undefined);

    const source = await readFile(new URL("../background.js", import.meta.url), "utf8");
    for (const needle of [
      "fetch(",
      "XMLHttpRequest",
      "WebSocket",
      "sendBeacon",
      "offscreen",
      "chrome.",
    ]) {
      assert.equal(source.includes(needle), false, needle);
    }
  });

  test("shows the assigned shortcut on the toolbar menu", async () => {
    state.commands[0].shortcut = "MacCtrl+Command+C";
    await listeners.commandChanged[0]();
    assert.deepEqual(state.menus, [
      {
        id: "shortcut-copy-page-address",
        title: "Copy the current page address: Control+Command+C",
        contexts: ["action"],
        enabled: false,
      },
    ]);
  });

  test("updates the menu when the shortcut changes", async () => {
    state.commands[0].shortcut = "";
    await listeners.commandChanged[0]();
    assert.equal(
      state.menus[0].title,
      "Copy the current page address: no shortcut assigned",
    );

    state.commands[0].shortcut = "Ctrl+Shift+U";
    await listeners.commandChanged[0]();
    assert.equal(state.menus[0].title, "Copy the current page address: Ctrl+Shift+U");
  });

  test("copies the tab address and flashes the green icon", async () => {
    resetCopyState();
    state.theme = { colors: { toolbar: "#f8f8f8" } };
    await click({ id: 7, url: "https://example.com/path" });
    assert.deepEqual(state.clipboard, ["https://example.com/path"]);
    assert.equal(state.execCommands.length, 0);
    assert.deepEqual(state.badges, [""]);
    assert.equal(state.icons[0].path[16], "icons/success16.png");
    assert.deepEqual(state.icons[1], { path: null });
  });

  test("uses the dark success icon on a dark toolbar", async () => {
    resetCopyState();
    state.theme = { colors: { toolbar: "rgb(28, 27, 34)" } };
    await click({ id: 7, url: "https://example.com/" });
    assert.equal(state.icons[0].path[16], "icons/success-dark16.png");
    assert.deepEqual(state.icons[1], { path: null });
  });

  test("follows the system scheme when the theme has no colors", async () => {
    resetCopyState();
    state.theme = {};
    state.colorSchemeDark = true;
    await click({ id: 7, url: "https://example.com/" });
    assert.equal(state.icons[0].path[16], "icons/success-dark16.png");
  });

  test("shows ! when the tab has no address", async () => {
    resetCopyState();
    await click({ id: 4 });
    assert.deepEqual(state.clipboard, []);
    assert.deepEqual(state.badges, ["!", ""]);
    assert.deepEqual(state.badgeColors, ["#8C3A3A"]);
    assert.equal(state.icons.length, 0);
  });

  test("shows ! when the clipboard rejects the write", async () => {
    resetCopyState();
    clipboard.writeText = () => Promise.reject(new Error("denied"));
    await click({ id: 4, url: "https://example.com/" });
    assert.deepEqual(state.clipboard, []);
    assert.deepEqual(state.execCommands, ["copy"]);
    assert.deepEqual(state.badges, ["!", ""]);
    assert.equal(state.icons.length, 0);
  });

  test("falls back to the background page when the clipboard API fails", async () => {
    resetCopyState();
    clipboard.writeText = () => Promise.reject(new Error("denied"));
    installDocument(true);
    await click({ id: 4, url: "https://example.com/fallback" });
    assert.deepEqual(state.execCommands, ["copy"]);
    assert.equal(state.icons[0].path[16], "icons/success16.png");
    assert.deepEqual(state.badges, [""]);
  });

  test("copies the focused tab from the keyboard shortcut", async () => {
    resetCopyState();
    state.tabs = [{ id: 3, url: "https://example.com/keys" }];
    const restore = useImmediateTimers();
    try {
      await listeners.command[0]("something-else");
      await listeners.command[0]("copy-page-address");
    } finally {
      restore();
    }
    assert.deepEqual(state.query, { active: true, lastFocusedWindow: true });
    assert.deepEqual(state.clipboard, ["https://example.com/keys"]);
  });

  test("reads a missing click url from the tab", async () => {
    resetCopyState();
    state.tabs = [{ id: 9, url: "https://example.com/fresh" }];
    await click({ id: 9 });
    assert.deepEqual(state.clipboard, ["https://example.com/fresh"]);
  });

  test("keeps overlapping copies in order", async () => {
    resetCopyState();
    let releaseFirst;
    clipboard.writeText = (text) => {
      state.clipboard.push(text);
      if (state.clipboard.length === 1) {
        return new Promise((resolve) => {
          releaseFirst = resolve;
        });
      }
      return Promise.resolve();
    };
    const restore = useImmediateTimers();
    const first = listeners.clicked[0]({ id: 1, url: "https://one.example/" });
    const second = listeners.clicked[0]({ id: 1, url: "https://two.example/" });
    for (let step = 0; step < 20 && !releaseFirst; step += 1) {
      await Promise.resolve();
    }
    assert.deepEqual(state.clipboard, ["https://one.example/"]);
    releaseFirst();
    try {
      await first;
      await second;
    } finally {
      restore();
    }
    assert.deepEqual(state.clipboard, [
      "https://one.example/",
      "https://two.example/",
    ]);
  });
});
