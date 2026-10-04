# Agents

Griffin Grab is a Manifest V3 Chrome extension. It copies the current tab address to the local clipboard. It must not send the address, or anything else, off the computer.

## Product rules

- Do not add host permissions, remote code, or network calls (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`).
- Keep permissions limited to `activeTab`, `clipboardWrite`, and `offscreen` unless the user asks for a capability that cannot work without another one.
- Keep the extension as plain modules. Do not add a build step.
- Leave the author as `Krzysztof Wielogórski <contact@wielo.co>` unless the user asks to change it.
- On Mac the shortcut stays Control+Command+C (`MacCtrl+Command+C`). Chrome treats bare `Ctrl` on Mac as Command.

## Version

The version is the `version` field in `manifest.json`. Chrome accepts one to four numbers separated by dots. Each number is from 0 through 65535, without leading zeros.

Bump that version in the same change as every user-visible feature or fix:

- New behavior bumps the minor number: `1.0.0` to `1.1.0`.
- A fix bumps the patch number: `1.1.0` to `1.1.1`.
- A breaking change bumps the major number: `1.1.1` to `2.0.0`. Breaking changes include a new required permission, a removed behavior, or a different default shortcut.

Do not bump the version for an internal-only edit that does not change what a person sees or what the extension is allowed to do. Do not wait for a GitHub release before bumping. One user-visible change gets one new version. Do not reuse a version that already has a heading in `CHANGELOG.md` or a `v` tag.

## Changelog

Record every version bump in `CHANGELOG.md`. Add `## x.y.z - YYYY-MM-DD` at the top, directly under `## Unreleased`, with bullets a person installing the extension can understand. Describe the behavior, not the file that implemented it.

`## Unreleased` is only for work that is not ready to ship. Before the change is finished, move those bullets into the new version section and leave `## Unreleased` empty.

## Releases

Do not run the release workflow unless the user asks for a release.

Before a release, `manifest.json` and the newest version heading in `CHANGELOG.md` must already match. On GitHub, open **Actions**, choose **Release**, and enter that version.

`.github/workflows/release.yml` then:

- Rejects a version Chrome would reject, and rejects a `v` tag that already exists.
- Writes the version into `manifest.json` when it differs, commits that change, and pushes it.
- Packs only `manifest.json`, `background.js`, `offscreen.html`, `offscreen.js`, and `icons/` into `griffin-grab-x.y.z.zip`. `CHANGELOG.md` stays out of the zip.
- Publishes GitHub release `vX.Y.Z`, titled `Griffin Grab x.y.z`, with that zip attached.
- Uses the matching changelog section as the release notes. The workflow fails when that section is missing or empty.
