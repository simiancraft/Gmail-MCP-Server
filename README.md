# Gmail MCP Server

[![CI](https://github.com/simiancraft/Gmail-MCP-Server/actions/workflows/release.yml/badge.svg)](https://github.com/simiancraft/Gmail-MCP-Server/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Checked with Biome](https://img.shields.io/badge/Checked_with-Biome-60a5fa?logo=biome)](https://biomejs.dev)

A [Model Context Protocol](https://modelcontextprotocol.io/) server for Gmail. Lets AI assistants read, send, search, label, and filter Gmail through natural language, with OAuth2 auto-authentication and full attachment support.

Built with TypeScript, [Bun](https://bun.sh/), and the [`googleapis`](https://github.com/googleapis/google-api-nodejs-client) client.

## Highlights

- **Structured JSON responses.** `read_email` and `search_emails` return parseable JSON objects, not pre-formatted text. Easier for downstream tools to consume without fragile string parsing. (See [Structured responses](#structured-responses) below.)
- **Full attachment support.** Send files, read attachment metadata, and download attachments to disk. Path traversal is blocked at the download boundary.
- **HTML-first email reading.** When a message has both plain text and HTML parts, both are returned so the client can pick.
- **Comprehensive label management.** Create, update, delete, list, and get-or-create labels. System labels are protected from deletion.
- **Gmail filter management.** Full CRUD on filters plus six templates (`fromSender`, `withSubject`, `withAttachments`, `largeEmails`, `containingText`, `mailingList`).
- **Batch operations.** Modify or delete many messages in one call, with graceful per-item fallback if a batch fails.
- **RFC 2047 subject encoding** for international characters.
- **Typed input validation** via Zod schemas on every tool.
- **Error responses set `isError: true`** so MCP clients can distinguish failures from successes.
- **Automated releases** via semantic-release on every push to `main`.

## Installation

### 1. Clone and build

```bash
git clone https://github.com/simiancraft/Gmail-MCP-Server.git
cd Gmail-MCP-Server
bun install
bun run build
```

### 2. Create Google Cloud OAuth credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create (or select) a project.
2. Enable the **Gmail API** for the project.
3. Under **APIs & Services → Credentials**, click **Create Credentials → OAuth client ID**.
4. Choose **Desktop app** or **Web application**. For Web application, add `http://localhost:3000/oauth2callback` to the authorized redirect URIs.
5. Download the JSON, rename it to `gcp-oauth.keys.json`.

### 3. Authenticate

```bash
mkdir -p ~/.gmail-mcp
mv gcp-oauth.keys.json ~/.gmail-mcp/
bun dist/index.js auth
```

The auth command:
- Looks for `gcp-oauth.keys.json` in the current directory or `~/.gmail-mcp/`.
- Opens your browser to the Google consent screen.
- Saves the resulting token to `~/.gmail-mcp/credentials.json`.

Credentials can be overridden with environment variables:
- `GMAIL_OAUTH_PATH` — path to the client keys JSON
- `GMAIL_CREDENTIALS_PATH` — path to the stored user token JSON

### 4. Wire it into your MCP client

Example for Claude Desktop:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "bun",
      "args": ["/absolute/path/to/Gmail-MCP-Server/dist/index.js"]
    }
  }
}
```

With custom credential paths:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "bun",
      "args": ["/absolute/path/to/Gmail-MCP-Server/dist/index.js"],
      "env": {
        "GMAIL_OAUTH_PATH": "/path/to/gcp-oauth.keys.json",
        "GMAIL_CREDENTIALS_PATH": "/path/to/credentials.json"
      }
    }
  }
}
```

## Structured responses

This is the most important behavioral difference worth calling out: **`read_email` and `search_emails` return structured JSON** rather than pre-formatted text blobs. The JSON is embedded in the MCP `content[0].text` field, so clients can `JSON.parse` it directly.

### `read_email` response

```json
{
  "messageId": "182ab45cd67ef",
  "threadId": "182ab45cd67ef",
  "subject": "Project Files",
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "date": "Thu, 19 Jun 2025 10:30:00 -0400",
  "body": {
    "text": "Plain text version of the email...",
    "html": "<html>Rich HTML version...</html>"
  },
  "attachments": [
    {
      "id": "ANGjdJ9fkTs...",
      "filename": "document.pdf",
      "mimeType": "application/pdf",
      "size": 250880
    }
  ]
}
```

`body.text` and `body.html` are independently `null` when the message does not contain that part. Most transactional/vendor email is HTML-only; some plain-text-only senders only populate `text`.

### `search_emails` response

```json
[
  {
    "id": "182ab45cd67ef",
    "subject": "Project Files",
    "from": "sender@example.com",
    "date": "Thu, 19 Jun 2025 10:30:00 -0400"
  }
]
```

All other tools return human-readable status text in `content[0].text` (e.g. `"Email sent successfully with ID: ..."`).

## Tool reference

All 19 tools accept validated JSON input. Required fields are called out explicitly; everything else is optional.

### Email

#### `send_email`
Sends a new email. Supports plain text, HTML, multipart, attachments, and threading.

```json
{
  "to": ["recipient@example.com"],
  "subject": "Meeting Tomorrow",
  "body": "Hi, reminder about our meeting.",
  "mimeType": "text/plain",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "attachments": ["/path/to/file.pdf"],
  "threadId": "182ab45cd67ef",
  "inReplyTo": "<message-id@example.com>"
}
```

- `mimeType` defaults to `text/plain`. Use `text/html` for HTML-only, or `multipart/alternative` with both `body` and `htmlBody` for clients that can render either.
- Attachments are validated for existence before send.

#### `draft_email`
Same input as `send_email` but creates a draft instead of sending.

#### `read_email`
Retrieves full content of a message. See [Structured responses](#structured-responses).

```json
{ "messageId": "182ab45cd67ef" }
```

#### `search_emails`
Searches using [Gmail search syntax](#gmail-search-syntax). Returns an array of metadata (see [Structured responses](#structured-responses)).

```json
{
  "query": "from:sender@example.com after:2024/01/01 has:attachment",
  "maxResults": 10
}
```

#### `modify_email`
Adds or removes labels on a single message. If both `addLabelIds` and `labelIds` are provided, `addLabelIds` takes precedence.

```json
{
  "messageId": "182ab45cd67ef",
  "addLabelIds": ["IMPORTANT"],
  "removeLabelIds": ["INBOX"]
}
```

#### `delete_email`
Permanently deletes an email. Irreversible.

```json
{ "messageId": "182ab45cd67ef" }
```

#### `download_attachment`
Downloads an attachment to disk. Filenames are sanitized (`path.basename`) and the resolved output path is verified to stay inside `savePath` to prevent traversal.

```json
{
  "messageId": "182ab45cd67ef",
  "attachmentId": "ANGjdJ9fkTs...",
  "savePath": "/path/to/downloads",
  "filename": "custom-name.pdf"
}
```

`savePath` defaults to the current working directory. `filename` defaults to the original filename from the message.

### Batch

#### `batch_modify_emails`
Adds/removes labels on many messages at once. Falls back to per-item retry if a batch fails.

```json
{
  "messageIds": ["id1", "id2", "id3"],
  "addLabelIds": ["IMPORTANT"],
  "removeLabelIds": ["INBOX"],
  "batchSize": 50
}
```

#### `batch_delete_emails`
Permanently deletes many messages in batches.

```json
{
  "messageIds": ["id1", "id2", "id3"],
  "batchSize": 50
}
```

### Labels

#### `list_email_labels`
Lists all labels, split into system and user groups.

```json
{}
```

#### `create_label`

```json
{
  "name": "Important Projects",
  "messageListVisibility": "show",
  "labelListVisibility": "labelShow"
}
```

#### `update_label`

```json
{
  "id": "Label_1234567890",
  "name": "Urgent Projects"
}
```

#### `delete_label`
Refuses to delete system labels.

```json
{ "id": "Label_1234567890" }
```

#### `get_or_create_label`
Idempotent. Returns the existing label if one with that name exists; otherwise creates it. The response tells you which happened.

```json
{
  "name": "Project XYZ",
  "messageListVisibility": "show",
  "labelListVisibility": "labelShow"
}
```

### Filters

#### `create_filter`

```json
{
  "criteria": {
    "from": "newsletter@company.com",
    "hasAttachment": false
  },
  "action": {
    "addLabelIds": ["Label_Newsletter"],
    "removeLabelIds": ["INBOX"]
  }
}
```

#### `list_filters`, `get_filter`, `delete_filter`

```json
{}
```
```json
{ "filterId": "ANe1Bmj..." }
```

#### `create_filter_from_template`
Six templates: `fromSender`, `withSubject`, `withAttachments`, `largeEmails`, `containingText`, `mailingList`.

```json
{
  "template": "fromSender",
  "parameters": {
    "senderEmail": "notifications@github.com",
    "labelIds": ["Label_GitHub"],
    "archive": true
  }
}
```

## Gmail search syntax

`search_emails` accepts any standard Gmail search operator:

| Operator | Example | Description |
|---|---|---|
| `from:` | `from:john@example.com` | Emails from a specific sender |
| `to:` | `to:mary@example.com` | Emails to a specific recipient |
| `subject:` | `subject:"meeting notes"` | Subject match |
| `has:attachment` | `has:attachment` | Has attachments |
| `after:` | `after:2024/01/01` | After a date |
| `before:` | `before:2024/02/01` | Before a date |
| `is:` | `is:unread` | Message state |
| `label:` | `label:work` | Has a specific label |

Combine freely: `from:john@example.com after:2024/01/01 has:attachment`.

## Security

- OAuth credentials are stored locally in `~/.gmail-mcp/` (or the paths set in env vars). Never commit them.
- Attachment downloads validate the resolved output path against `savePath` to block path traversal via crafted filenames.
- The server requests `gmail.modify` and `gmail.settings.basic` scopes — enough to read/send/label/filter, but not to change account settings beyond filters.
- Offline access is used so the token refreshes without re-consent. Revoke in your Google Account → Security → Third-party access if you want to kill it.
- Error responses set `isError: true` so clients can distinguish failures from successes rather than pattern-matching on text.

## Development

```bash
bun install          # install dependencies
bun run build        # compile TypeScript to dist/
bun test             # run the test suite (53 tests)
bun run lint         # biome check
bun run lint:fix     # biome auto-fix
bun run format       # biome format
```

Tests live alongside source as `src/*.test.ts` and use Bun's built-in test runner. Running `bun test` discovers them automatically — no extra config.

### Commit style

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and [semantic-release](https://github.com/semantic-release/semantic-release). Pushes to `main` with the right prefix automatically bump the version and publish a GitHub Release.

| Prefix | Bump | Example |
|---|---|---|
| `fix:` | patch | `fix: handle missing attachment header` |
| `feat:` | minor | `feat: add batch label operations` |
| `feat!:` / `BREAKING CHANGE:` | major | `feat!: change auth flow` |
| `chore:`, `docs:`, `ci:`, `refactor:`, `test:` | no release | `chore: update biome config` |

## Troubleshooting

1. **OAuth keys not found.** Make sure `gcp-oauth.keys.json` is in `~/.gmail-mcp/` (or in your current working directory at auth time).
2. **Invalid credentials format.** The keys file must contain either a `web` or `installed` block. For web apps, verify `http://localhost:3000/oauth2callback` is in the authorized redirect URIs.
3. **Port 3000 already in use.** Free it before running `bun dist/index.js auth` — the OAuth callback server listens there.
4. **Batch operation failures.** Batches automatically retry per-item; check the returned failure list. If you're hitting rate limits, lower `batchSize`.
5. **Attachment send fails.** Verify paths exist and are readable. Gmail's per-message attachment cap is 25 MB.

## License

MIT. See [LICENSE](LICENSE).

## History

This project started as a clone of [gongrzhe/server-gmail-autoauth-mcp](https://github.com/gongrzhe/server-gmail-autoauth-mcp) in 2025. It has since diverged substantially — rewritten build/runtime to Bun, added semantic-release, restructured source into separate schemas/label/filter modules, added a full test suite, changed `read_email` and `search_emails` to return structured JSON, and tightened security, error handling, and type safety. The LICENSE file preserves the original MIT copyright, per the license's requirements.
