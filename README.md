# Copy Page Address

A Chrome extension that copies the current tab’s address to the clipboard.

Press **Control+Command+C** on Mac, or **Ctrl+Shift+U** on Windows, Linux, and ChromeOS. Chrome does not allow Ctrl+Alt shortcuts. Clicking the toolbar icon copies the address as well. A short **OK** on the icon means the address was copied. **!** means Chrome did not provide an address for that tab, or the clipboard write failed.

Nothing is sent off the computer. The extension has no host permission and does not call the network. It only reads the active tab address when you use the shortcut or the icon, then writes that text to the local clipboard.

Author: Krzysztof Wielogórski (kwielogorski@gmail.com)

## Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this folder.
4. If the shortcut is already taken, set it at `chrome://extensions/shortcuts`. Chrome applies the suggested shortcut when the extension is first installed.

On Mac the shortcut is Control+Command+C (`MacCtrl+Command+C`). Chrome treats a bare `Ctrl` on Mac as Command, so Control is declared separately.

## Permissions

- `activeTab` — read the current tab’s address only when you press the shortcut or the icon.
- `clipboardWrite` — write that address to the clipboard.
- `offscreen` — a hidden extension page that performs the write, so the site itself is never modified.
