# MIoT Log Inspector

Chrome Manifest V3 extension for inspecting full JSON messages in `iot.mi.com` MIoT device log tables.

## Features

- Opens as a Chrome Side Panel.
- Reads `.device-log-main-log` rows from `https://iot.mi.com/*`.
- Extracts time, message type, and full message JSON from `.multiLineHide[title]`.
- Expands nested JSON strings before display and search.
- Shows the extracted log list in the Side Panel while keeping the original page table as the source of truth.
- Searches across time, type, raw JSON, and expanded JSON with a dedicated full-text input.
- Supports structured point search:
  - `sp` input accepts `<siid>.<piid>` property points, for example `2.24`.
  - `sa` input accepts `<siid>.<aiid>` action points, for example `2.47`.
  - Multiple points are separated by spaces, for example `sp: 2.2 2.3` and `sa: 2.5 2.6`.
  - Multiple point tokens match any token; combining with text requires both point and text to match.
- Selects key logs and copies them as `time type body` lines, where `body` is the original raw JSON.
- Opens formatted JSON in an on-demand drawer when a result row is clicked.
- Highlights matching structured JSON objects in the drawer.

## Development

```bash
npm install
npm test
npm run typecheck
npm run build
```

Load the generated `dist/` directory from `chrome://extensions` with Developer Mode enabled.

## Store Screenshots

After loading `dist/` locally, open `chrome-extension://<extension-id>/sidepanel.html?demo=1` to use screenshot mock data. The demo mode is only activated by this URL parameter and does not change the normal `iot.mi.com` page flow.

## Notes

- Chrome 114+ is required for the Side Panel API.
- The extension is intentionally scoped to `https://iot.mi.com/*`.
- Log data is processed locally in the browser and is not uploaded or stored remotely.

## License

Apache License 2.0. See [LICENSE](LICENSE).
