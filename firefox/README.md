# Griffin Grab

A Firefox extension that copies the current tab’s address to the clipboard.

Press **Control+Command+C** on Mac, or **Ctrl+Shift+U** on other systems. Clicking the toolbar icon copies the address as well. Right-click the icon to see the keyboard shortcut assigned on this computer. The toolbar icon follows the light or dark theme, and turns green when the address was copied. **!** means Firefox did not provide an address for that tab, or the clipboard write failed.

Nothing is sent off the computer. The extension has no host permission and does not call the network. It only reads the active tab address when you use the shortcut or the icon, then writes that text to the local clipboard.

Author: Krzysztof Wielogórski (contact@wielo.co)

## Install

Firefox removes a temporary add-on when it quits. To try Griffin Grab:

1. Open `about:debugging`.
2. Choose **This Firefox**.
3. Choose **Load Temporary Add-on**.
4. Select `manifest.json` in this folder.

The button is added beside the address bar. If the shortcut is already taken, set it from the Add-ons Manager: open `about:addons`, choose the gear menu, then **Manage Extension Shortcuts**.

On Mac the shortcut is Control+Command+C (`MacCtrl+Command+C`). Firefox treats a bare `Ctrl` on Mac as Command, so Control is declared separately.

Firefox leaves the extension out of private windows until you allow it. Open the extension in the Add-ons Manager and choose **Run in Private Windows**.

A lasting install on regular Firefox has to be signed by [addons.mozilla.org](https://addons.mozilla.org/). The GitHub release zip is unsigned. Firefox Developer Edition and Nightly can install that zip without a signature after setting `xpinstall.signatures.required` to `false` in `about:config`.

## Release

On GitHub, open **Actions**, choose **Release**, and run the workflow. Enter a version such as `1.1.0`. Firefox accepts one to four numbers separated by dots, and each number must be 65535 or less.

The workflow writes that version into `manifest.json` when it changed, tags `v1.1.0`, and attaches `griffin-grab-firefox-1.1.0.zip` to a GitHub release. The release notes are the matching section of `CHANGELOG.md`.

## Permissions

- `activeTab` — read the current tab’s address only when you press the shortcut or the icon.
- `clipboardWrite` — write that address to the clipboard.
- `contextMenus` — show the assigned keyboard shortcut when you right-click the toolbar icon.

Firefox has no offscreen document. The background page writes the clipboard, so the site itself is never modified. The manifest theme icons follow the toolbar, including a custom theme.
