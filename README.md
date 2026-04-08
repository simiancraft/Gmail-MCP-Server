# Gmail MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for Gmail integration with auto authentication support. This server enables AI assistants to manage Gmail through natural language interactions.

> **Fork notice:** This is a fork of [gongrzhe/server-gmail-autoauth-mcp](https://github.com/gongrzhe/server-gmail-autoauth-mcp) with independent development. It is **not** published to npm or Smithery under the original package name. Install from this repository directly.

## Features

- Send emails with subject, content, **attachments**, and recipients
- **Full attachment support** - send and receive file attachments
- **Download email attachments** to local filesystem
- Support for HTML emails and multipart messages with both HTML and plain text versions
- Full support for international characters in subject lines and email content
- Read email messages by ID with advanced MIME structure handling
- **HTML-first email reading** - returns HTML content when available for rich formatting
- **Enhanced attachment display** showing filenames, types, sizes, and download IDs
- Search emails with various criteria (subject, sender, date range)
- **Comprehensive label management** - create, update, delete, and list labels
- List all available Gmail labels (system and user-defined)
- List emails in inbox, sent, or custom labels
- Mark emails as read/unread
- Move emails to different labels/folders
- Delete emails
- **Batch operations for efficiently processing multiple emails at once**
- **Filter management** - create, list, get, and delete Gmail filters
- **Filter templates** for common scenarios (sender, subject, attachments, etc.)
- Full integration with Gmail API
- Simple OAuth2 authentication flow with auto browser launch
- Support for both Desktop and Web application credentials
- Global credential storage for convenience

## Installation & Authentication

### 1. Clone and build

```bash
git clone https://github.com/simiancraft/Gmail-MCP-Server.git
cd Gmail-MCP-Server
bun install
bun run build
```

### 2. Create a Google Cloud Project and obtain credentials

a. Create a Google Cloud Project:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Gmail API for your project

b. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose either "Desktop app" or "Web application" as application type
   - Give it a name and click "Create"
   - For Web application, add `http://localhost:3000/oauth2callback` to the authorized redirect URIs
   - Download the JSON file of your client's OAuth keys
   - Rename the key file to `gcp-oauth.keys.json`

### 3. Run Authentication

```bash
# Place gcp-oauth.keys.json in the global config directory
mkdir -p ~/.gmail-mcp
mv gcp-oauth.keys.json ~/.gmail-mcp/

# Run authentication
bun dist/index.js auth
```

The authentication process will:
- Look for `gcp-oauth.keys.json` in the current directory or `~/.gmail-mcp/`
- If found in current directory, copy it to `~/.gmail-mcp/`
- Open your default browser for Google authentication
- Save credentials as `~/.gmail-mcp/credentials.json`

> **Note:**
> - After successful authentication, credentials are stored globally in `~/.gmail-mcp/` and can be used from any directory
> - Both Desktop app and Web application credentials are supported
> - For Web application credentials, make sure to add `http://localhost:3000/oauth2callback` to your authorized redirect URIs

### 4. Configure your MCP client

Point your MCP client at the built server. For example, in Claude Desktop:

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

Or if you use environment variables for credential paths:

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

## Available Tools

The server provides the following tools:

### 1. Send Email (`send_email`)

Sends a new email immediately. Supports plain text, HTML, or multipart emails with optional file attachments.

Basic Email:
```json
{
  "to": ["recipient@example.com"],
  "subject": "Meeting Tomorrow",
  "body": "Hi,\n\nJust a reminder about our meeting tomorrow at 10 AM.\n\nBest regards",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "mimeType": "text/plain"
}
```

Email with Attachments:
```json
{
  "to": ["recipient@example.com"],
  "subject": "Project Files",
  "body": "Hi,\n\nPlease find the project files attached.\n\nBest regards",
  "attachments": [
    "/path/to/document.pdf",
    "/path/to/spreadsheet.xlsx",
    "/path/to/presentation.pptx"
  ]
}
```

HTML Email:
```json
{
  "to": ["recipient@example.com"],
  "subject": "Meeting Tomorrow",
  "mimeType": "text/html",
  "body": "<html><body><h1>Meeting Reminder</h1><p>Just a reminder about our <b>meeting tomorrow</b> at 10 AM.</p></body></html>"
}
```

Multipart Email (HTML + Plain Text):
```json
{
  "to": ["recipient@example.com"],
  "subject": "Meeting Tomorrow",
  "mimeType": "multipart/alternative",
  "body": "Hi,\n\nJust a reminder about our meeting tomorrow at 10 AM.\n\nBest regards",
  "htmlBody": "<html><body><h1>Meeting Reminder</h1><p>Just a reminder about our <b>meeting tomorrow</b> at 10 AM.</p></body></html>"
}
```

### 2. Draft Email (`draft_email`)
Creates a draft email without sending it. Also supports attachments.

```json
{
  "to": ["recipient@example.com"],
  "subject": "Draft Report",
  "body": "Here's the draft report for your review.",
  "cc": ["manager@example.com"],
  "attachments": ["/path/to/draft_report.docx"]
}
```

### 3. Read Email (`read_email`)
Retrieves the content of a specific email by its ID. Shows enhanced attachment information.

```json
{
  "messageId": "182ab45cd67ef"
}
```

Response is structured JSON with both text and HTML body:
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

The `body.text` and `body.html` fields are `null` when that content type is not present in the email. Most transactional/vendor emails only have HTML; some plain-text-only senders will only have `text`.

### 4. Download Attachment (`download_attachment`)
Downloads email attachments to your local filesystem.

```json
{
  "messageId": "182ab45cd67ef",
  "attachmentId": "ANGjdJ9fkTs-i3GCQo5o97f_itG...",
  "savePath": "/path/to/downloads",
  "filename": "downloaded_document.pdf"
}
```

Parameters:
- `messageId`: The ID of the email containing the attachment
- `attachmentId`: The attachment ID (shown in enhanced email display)
- `savePath`: Directory to save the file (optional, defaults to current directory)
- `filename`: Custom filename (optional, uses original filename if not provided)

### 5. Search Emails (`search_emails`)
Searches for emails using Gmail search syntax.

```json
{
  "query": "from:sender@example.com after:2024/01/01 has:attachment",
  "maxResults": 10
}
```

### 6. Modify Email (`modify_email`)
Adds or removes labels from emails (move to different folders, archive, etc.).

```json
{
  "messageId": "182ab45cd67ef",
  "addLabelIds": ["IMPORTANT"],
  "removeLabelIds": ["INBOX"]
}
```

### 7. Delete Email (`delete_email`)
Permanently deletes an email.

```json
{
  "messageId": "182ab45cd67ef"
}
```

### 8. List Email Labels (`list_email_labels`)
Retrieves all available Gmail labels.

```json
{}
```

### 9. Create Label (`create_label`)
Creates a new Gmail label.

```json
{
  "name": "Important Projects",
  "messageListVisibility": "show",
  "labelListVisibility": "labelShow"
}
```

### 10. Update Label (`update_label`)
Updates an existing Gmail label.

```json
{
  "id": "Label_1234567890",
  "name": "Urgent Projects",
  "messageListVisibility": "show",
  "labelListVisibility": "labelShow"
}
```

### 11. Delete Label (`delete_label`)
Deletes a Gmail label.

```json
{
  "id": "Label_1234567890"
}
```

### 12. Get or Create Label (`get_or_create_label`)
Gets an existing label by name or creates it if it doesn't exist.

```json
{
  "name": "Project XYZ",
  "messageListVisibility": "show",
  "labelListVisibility": "labelShow"
}
```

### 13. Batch Modify Emails (`batch_modify_emails`)
Modifies labels for multiple emails in efficient batches.

```json
{
  "messageIds": ["182ab45cd67ef", "182ab45cd67eg", "182ab45cd67eh"],
  "addLabelIds": ["IMPORTANT"],
  "removeLabelIds": ["INBOX"],
  "batchSize": 50
}
```

### 14. Batch Delete Emails (`batch_delete_emails`)
Permanently deletes multiple emails in efficient batches.

```json
{
  "messageIds": ["182ab45cd67ef", "182ab45cd67eg", "182ab45cd67eh"],
  "batchSize": 50
}
```

### 15. Create Filter (`create_filter`)
Creates a new Gmail filter with custom criteria and actions.

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

### 16. List Filters (`list_filters`)
Retrieves all Gmail filters.

```json
{}
```

### 17. Get Filter (`get_filter`)
Gets details of a specific Gmail filter.

```json
{
  "filterId": "ANe1Bmj1234567890"
}
```

### 18. Delete Filter (`delete_filter`)
Deletes a Gmail filter.

```json
{
  "filterId": "ANe1Bmj1234567890"
}
```

### 19. Create Filter from Template (`create_filter_from_template`)
Creates a filter using pre-defined templates for common scenarios.

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

Available templates: `fromSender`, `withSubject`, `withAttachments`, `largeEmails`, `containingText`, `mailingList`.

## Advanced Search Syntax

The `search_emails` tool supports Gmail's search operators:

| Operator | Example | Description |
|----------|---------|-------------|
| `from:` | `from:john@example.com` | Emails from a specific sender |
| `to:` | `to:mary@example.com` | Emails sent to a specific recipient |
| `subject:` | `subject:"meeting notes"` | Emails with specific text in the subject |
| `has:attachment` | `has:attachment` | Emails with attachments |
| `after:` | `after:2024/01/01` | Emails received after a date |
| `before:` | `before:2024/02/01` | Emails received before a date |
| `is:` | `is:unread` | Emails with a specific state |
| `label:` | `label:work` | Emails with a specific label |

Combine operators: `from:john@example.com after:2024/01/01 has:attachment`

## Email Content Extraction

The server extracts email content from complex MIME structures:

- Prefers HTML content when available (most vendor and transactional emails are HTML-only)
- Falls back to plain text if no HTML part exists
- Handles multi-part MIME messages with nested parts
- Extracts attachment metadata (filename, type, size, download ID)
- Preserves original email headers (From, To, Subject, Date)

## Security Notes

- OAuth credentials are stored in `~/.gmail-mcp/`
- The server uses offline access to maintain persistent authentication
- Never share or commit your credentials to version control
- Regularly review and revoke unused access in your Google Account settings
- Attachment files are processed locally and never stored permanently by the server

## Troubleshooting

1. **OAuth Keys Not Found**
   - Make sure `gcp-oauth.keys.json` is in either your current directory or `~/.gmail-mcp/`
   - Check file permissions

2. **Invalid Credentials Format**
   - Ensure your OAuth keys file contains either `web` or `installed` credentials
   - For web applications, verify the redirect URI is correctly configured

3. **Port Already in Use**
   - If port 3000 is already in use, free it before running authentication

4. **Batch Operation Failures**
   - They automatically retry individual items
   - Check error messages for specific failures
   - Reduce batch size if you encounter rate limiting

5. **Attachment Issues**
   - Verify attachment file paths are correct and accessible
   - Check read/write permissions
   - Gmail has a 25MB attachment size limit per email

## Development

```bash
bun install          # install dependencies
bun run build        # compile TypeScript
bun run lint         # check with biome
bun run lint:fix     # auto-fix lint issues
bun run format       # format source files
```

### Commit style

This project uses [conventional commits](https://www.conventionalcommits.org/) and [semantic-release](https://github.com/semantic-release/semantic-release). Pushing to `main` with the right prefix automatically bumps the version and creates a GitHub Release.

| Prefix | Bump | Example |
|---|---|---|
| `fix:` | patch | `fix: handle missing attachment header` |
| `feat:` | minor | `feat: add batch label operations` |
| `feat!:` or `BREAKING CHANGE:` | major | `feat!: change auth flow` |
| `chore:`, `docs:`, `ci:` | no release | `chore: update biome config` |

## License

ISC

## Upstream

Forked from [gongrzhe/server-gmail-autoauth-mcp](https://github.com/gongrzhe/server-gmail-autoauth-mcp).
