# Griffin Grab

A Chrome extension that copies the current tab’s address to the clipboard.

Press **Control+Command+C** on Mac, or **Ctrl+Shift+U** on Windows, Linux, and ChromeOS. Chrome does not allow Ctrl+Alt shortcuts. Clicking the toolbar icon copies the address as well. The toolbar icon follows the light or dark theme, and turns green when the address was copied. **!** means Chrome did not provide an address for that tab, or the clipboard write failed.

Nothing is sent off the computer. The extension has no host permission and does not call the network. It only reads the active tab address when you use the shortcut or the icon, then writes that text to the local clipboard.

Author: Krzysztof Wielogórski (contact@wielo.co)

## Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this folder.
4. If the shortcut is already taken, set it at `chrome://extensions/shortcuts`. Chrome applies the suggested shortcut when the extension is first installed.

On Mac the shortcut is Control+Command+C (`MacCtrl+Command+C`). Chrome treats a bare `Ctrl` on Mac as Command, so Control is declared separately.

## Release

On GitHub, open **Actions**, choose **Release**, and run the workflow. Enter a version such as `1.1.0`. Chrome accepts one to four numbers separated by dots, and each number must be 65535 or less.

The workflow writes that version into `manifest.json` when it changed, tags `v1.1.0`, and attaches `griffin-grab-1.1.0.zip` to a GitHub release. The release notes are the matching section of `CHANGELOG.md`. Load the unzipped folder from `chrome://extensions`, or upload the zip to the Chrome Web Store.

## Permissions

- `activeTab` — read the current tab’s address only when you press the shortcut or the icon.
- `clipboardWrite` — write that address to the clipboard.
- `offscreen` — a hidden extension page that performs the write, so the site itself is never modified.
