# Agents

Griffin Grab is a Manifest V3 Firefox extension. It copies the current tab address to the local clipboard. It must not send the address, or anything else, off the computer.

## Product rules

- Do not add host permissions, remote code, or network calls (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`).
- Keep permissions limited to `activeTab`, `clipboardWrite`, and `contextMenus` unless the user asks for a capability that cannot work without another one.
- Do not add the `theme` permission. `theme.getCurrent()` works without it, and the permission makes Firefox treat the add-on as a theme.
- Do not add an offscreen document. Firefox background scripts run in a page that can write the clipboard. Chrome’s offscreen API is not available here.
- Keep the extension as plain modules. Do not add a build step.
- Leave the author as `Krzysztof Wielogórski <contact@wielo.co>` unless the user asks to change it.
- Leave the extension id as `griffin-grab@wielo.co`.
- Keep `data_collection_permissions.required` as `["none"]`. This extension collects nothing.
- On Mac the shortcut stays Control+Command+C (`MacCtrl+Command+C`). Firefox treats bare `Ctrl` on Mac as Command.
- Keep the toolbar button in `default_area` `navbar`. Firefox otherwise places a new action in the application menu.
- Keep `strict_min_version` at `140.0` or newer. That is the Firefox release that shows the built-in data-collection consent.

## Version

The version is the `version` field in `manifest.json`. Use one to four numbers separated by dots. Each number is from 0 through 65535, without leading zeros.

Bump that version in the same change as every user-visible feature or fix:

- New behavior bumps the minor number: `1.0.0` to `1.1.0`.
- A fix bumps the patch number: `1.1.0` to `1.1.1`.
- A breaking change bumps the major number: `1.1.1` to `2.0.0`. Breaking changes include a new required permission, a removed behavior, a different default shortcut, or a higher `strict_min_version` that drops a Firefox release the extension already ran on.

Do not bump the version for an internal-only edit that does not change what a person sees or what the extension is allowed to do. Do not wait for a GitHub release before bumping. One user-visible change gets one new version. Do not reuse a version that already has a heading in `CHANGELOG.md` or a `v` tag.

## Changelog

Record every version bump in `CHANGELOG.md`. Add `## x.y.z - YYYY-MM-DD` at the top, directly under `## Unreleased`, with bullets a person installing the extension can understand. Describe the behavior, not the file that implemented it.

`## Unreleased` is only for work that is not ready to ship. Before the change is finished, move those bullets into the new version section and leave `## Unreleased` empty.

## Testing

Run `node --test` from the repository root. It checks the copy behavior without Firefox.

`npx web-ext lint` checks the manifest. Do not commit `web-ext-artifacts/`.

## Releases

Do not run the release workflow unless the user asks for a release.

Before a release, `manifest.json` and the newest version heading in `CHANGELOG.md` must already match. On GitHub, open **Actions**, choose **Release**, and enter that version.

`.github/workflows/release.yml` then:

- Rejects a version Firefox would reject, and rejects a `v` tag that already exists.
- Writes the version into `manifest.json` when it differs, commits that change, and pushes it.
- Packs only `manifest.json`, `background.js`, and `icons/` into `griffin-grab-firefox-x.y.z.zip`. `CHANGELOG.md` stays out of the zip.
- Publishes GitHub release `vX.Y.Z`, titled `Griffin Grab for Firefox x.y.z`, with that zip attached.
- Uses the matching changelog section as the release notes. The workflow fails when that section is missing or empty.
