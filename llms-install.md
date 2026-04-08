# Gmail MCP Server - Installation Guide

This guide will help you install and configure the Gmail MCP Server for managing Gmail operations through an MCP client with auto authentication support.

> This is a fork of [gongrzhe/server-gmail-autoauth-mcp](https://github.com/gongrzhe/server-gmail-autoauth-mcp). Install from this repository directly.

## Requirements

- [Bun](https://bun.sh/) installed
- Access to create a Google Cloud Project
- Web browser for OAuth authentication

## Installation Steps

1. Clone and build:
   ```bash
   git clone https://github.com/simiancraft/Gmail-MCP-Server.git
   cd Gmail-MCP-Server
   bun install
   bun run build
   ```

2. Create a Google Cloud Project and obtain credentials:
   ```
   1. Go to Google Cloud Console (https://console.cloud.google.com)
   2. Create a new project or select an existing one
   3. Enable the Gmail API for your project
   4. Create OAuth 2.0 credentials:
      - Go to "APIs & Services" > "Credentials"
      - Click "Create Credentials" > "OAuth client ID"
      - Choose "Desktop app" or "Web application" type
      - For Web application, add http://localhost:3000/oauth2callback to redirect URIs
      - Download the OAuth keys JSON file
      - Rename it to gcp-oauth.keys.json
   ```

3. Set up configuration and authenticate:
   ```bash
   mkdir -p ~/.gmail-mcp
   mv gcp-oauth.keys.json ~/.gmail-mcp/
   bun dist/index.js auth
   ```
   This will:
   - Look for gcp-oauth.keys.json in current directory or ~/.gmail-mcp/
   - Copy it to ~/.gmail-mcp/ if found in current directory
   - Launch browser for Google authentication
   - Save credentials as ~/.gmail-mcp/credentials.json

4. Configure your MCP client (e.g. Claude Desktop):
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

## Troubleshooting

1. OAuth Keys Issues:
   - Verify gcp-oauth.keys.json exists in correct location
   - Check file permissions
   - Ensure keys contain valid web or installed credentials

2. Authentication Errors:
   - Confirm Gmail API is enabled
   - For web applications, verify redirect URI configuration
   - Check port 3000 is available during authentication

3. Configuration Issues:
   - Verify ~/.gmail-mcp directory exists and has correct permissions
   - Check credentials.json was created after authentication
   - Ensure MCP client configuration is properly formatted

## Security Notes

- Store OAuth credentials securely in ~/.gmail-mcp/
- Never commit credentials to version control
- Use proper file permissions for config directory
- Regularly review access in Google Account settings

## Usage Examples

After installation, you can perform various Gmail operations:

### Send Email
```json
{
  "to": ["recipient@example.com"],
  "subject": "Meeting Tomorrow",
  "body": "Hi,\n\nJust a reminder about our meeting tomorrow at 10 AM.\n\nBest regards",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"]
}
```

### Search Emails
```json
{
  "query": "from:sender@example.com after:2024/01/01",
  "maxResults": 10
}
```

### Manage Email
- Read emails by ID (returns HTML content when available)
- Move emails between labels
- Mark emails as read/unread
- Delete emails
- List emails in different folders

For more details, see the [README](README.md) or file an issue on the GitHub repository.
