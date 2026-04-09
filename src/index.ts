#!/usr/bin/env node

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    type CallToolResult,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { type gmail_v1, google } from "googleapis";
import { zodToJsonSchema } from "zod-to-json-schema";
import { authenticate, loadCredentials } from "./auth.js";
import { handleDownloadAttachment } from "./handlers/attachments.js";
import {
    handleBatchDeleteEmails,
    handleBatchModifyEmails,
} from "./handlers/batch-email.js";
import {
    handleDeleteEmail,
    handleDraftEmail,
    handleModifyEmail,
    handleReadEmail,
    handleSearchEmails,
    handleSendEmail,
} from "./handlers/email.js";
import {
    handleCreateFilter,
    handleCreateFilterFromTemplate,
    handleDeleteFilter,
    handleGetFilter,
    handleListFilters,
} from "./handlers/filters.js";
import {
    handleCreateLabel,
    handleDeleteLabel,
    handleGetOrCreateLabel,
    handleListLabels,
    handleUpdateLabel,
} from "./handlers/labels.js";
import {
    BatchDeleteEmailsSchema,
    BatchModifyEmailsSchema,
    CreateFilterFromTemplateSchema,
    CreateFilterSchema,
    CreateLabelSchema,
    DeleteEmailSchema,
    DeleteFilterSchema,
    DeleteLabelSchema,
    DownloadAttachmentSchema,
    GetFilterSchema,
    GetOrCreateLabelSchema,
    ListEmailLabelsSchema,
    ListFiltersSchema,
    ModifyEmailSchema,
    ReadEmailSchema,
    SearchEmailsSchema,
    SendEmailSchema,
    UpdateLabelSchema,
} from "./schemas.js";
import { errorMessage } from "./utl.js";

// Re-exports for tests and external consumers
export { extractEmailContent, type GmailMessagePart } from "./mime.js";

const _require = createRequire(import.meta.url);
const { version: SERVER_VERSION } = _require("../package.json");

type ToolHandler = (
    gmail: gmail_v1.Gmail,
    args: unknown,
) => Promise<CallToolResult>;

const TOOL_DEFINITIONS = [
    {
        name: "send_email",
        description: "Sends a new email",
        schema: SendEmailSchema,
        handler: handleSendEmail,
    },
    {
        name: "draft_email",
        description: "Draft a new email",
        schema: SendEmailSchema,
        handler: handleDraftEmail,
    },
    {
        name: "read_email",
        description: "Retrieves the content of a specific email",
        schema: ReadEmailSchema,
        handler: handleReadEmail,
    },
    {
        name: "search_emails",
        description: "Searches for emails using Gmail search syntax",
        schema: SearchEmailsSchema,
        handler: handleSearchEmails,
    },
    {
        name: "modify_email",
        description: "Modifies email labels (move to different folders)",
        schema: ModifyEmailSchema,
        handler: handleModifyEmail,
    },
    {
        name: "delete_email",
        description: "Permanently deletes an email",
        schema: DeleteEmailSchema,
        handler: handleDeleteEmail,
    },
    {
        name: "list_email_labels",
        description: "Retrieves all available Gmail labels",
        schema: ListEmailLabelsSchema,
        handler: handleListLabels,
    },
    {
        name: "batch_modify_emails",
        description: "Modifies labels for multiple emails in batches",
        schema: BatchModifyEmailsSchema,
        handler: handleBatchModifyEmails,
    },
    {
        name: "batch_delete_emails",
        description: "Permanently deletes multiple emails in batches",
        schema: BatchDeleteEmailsSchema,
        handler: handleBatchDeleteEmails,
    },
    {
        name: "create_label",
        description: "Creates a new Gmail label",
        schema: CreateLabelSchema,
        handler: handleCreateLabel,
    },
    {
        name: "update_label",
        description: "Updates an existing Gmail label",
        schema: UpdateLabelSchema,
        handler: handleUpdateLabel,
    },
    {
        name: "delete_label",
        description: "Deletes a Gmail label",
        schema: DeleteLabelSchema,
        handler: handleDeleteLabel,
    },
    {
        name: "get_or_create_label",
        description:
            "Gets an existing label by name or creates it if it doesn't exist",
        schema: GetOrCreateLabelSchema,
        handler: handleGetOrCreateLabel,
    },
    {
        name: "create_filter",
        description:
            "Creates a new Gmail filter with custom criteria and actions",
        schema: CreateFilterSchema,
        handler: handleCreateFilter,
    },
    {
        name: "list_filters",
        description: "Retrieves all Gmail filters",
        schema: ListFiltersSchema,
        handler: handleListFilters,
    },
    {
        name: "get_filter",
        description: "Gets details of a specific Gmail filter",
        schema: GetFilterSchema,
        handler: handleGetFilter,
    },
    {
        name: "delete_filter",
        description: "Deletes a Gmail filter",
        schema: DeleteFilterSchema,
        handler: handleDeleteFilter,
    },
    {
        name: "create_filter_from_template",
        description:
            "Creates a filter using a pre-defined template for common scenarios",
        schema: CreateFilterFromTemplateSchema,
        handler: handleCreateFilterFromTemplate,
    },
    {
        name: "download_attachment",
        description: "Downloads an email attachment to a specified location",
        schema: DownloadAttachmentSchema,
        handler: handleDownloadAttachment,
    },
] as const;

const HANDLER_BY_NAME: Record<string, ToolHandler> = Object.fromEntries(
    TOOL_DEFINITIONS.map((t) => [t.name, t.handler]),
);

async function main() {
    const oauth2Client = await loadCredentials();

    if (process.argv[2] === "auth") {
        await authenticate(oauth2Client);
        console.log("Authentication completed successfully");
        process.exit(0);
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const server = new Server(
        {
            name: "gmail",
            version: SERVER_VERSION,
        },
        {
            capabilities: {
                tools: {},
            },
        },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOL_DEFINITIONS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: zodToJsonSchema(t.schema),
        })),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const handler = HANDLER_BY_NAME[name];

        if (!handler) {
            return {
                content: [
                    { type: "text", text: `Error: Unknown tool: ${name}` },
                ],
                isError: true,
            };
        }

        try {
            return await handler(gmail, args);
        } catch (error: unknown) {
            return {
                content: [
                    { type: "text", text: `Error: ${errorMessage(error)}` },
                ],
                isError: true,
            };
        }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

// Only run main when this file is the direct entry point (not imported by tests)
const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (currentFile === entryFile) {
    main().catch((error) => {
        console.error("Server error:", error);
        process.exit(1);
    });
}
