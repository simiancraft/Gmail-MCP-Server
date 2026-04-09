import fs from "node:fs";
import path from "node:path";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { gmail_v1 } from "googleapis";
import { findAttachmentFilename } from "../mime.js";
import { DownloadAttachmentSchema } from "../schemas.js";
import { errorMessage } from "../utl.js";

type Gmail = gmail_v1.Gmail;

export async function handleDownloadAttachment(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = DownloadAttachmentSchema.parse(args);

    try {
        const attachmentResponse = await gmail.users.messages.attachments.get({
            userId: "me",
            messageId: validatedArgs.messageId,
            id: validatedArgs.attachmentId,
        });

        if (!attachmentResponse.data.data) {
            throw new Error("No attachment data received");
        }

        const buffer = Buffer.from(attachmentResponse.data.data, "base64url");

        const savePath = validatedArgs.savePath || process.cwd();
        let filename = validatedArgs.filename
            ? path.basename(validatedArgs.filename)
            : undefined;

        if (!filename) {
            // Look up the original filename from the message payload
            const messageResponse = await gmail.users.messages.get({
                userId: "me",
                id: validatedArgs.messageId,
                format: "full",
            });
            filename =
                findAttachmentFilename(
                    messageResponse.data.payload ?? undefined,
                    validatedArgs.attachmentId,
                ) || `attachment-${validatedArgs.attachmentId}`;
        }

        // Sanitize filename to prevent path traversal
        filename = path.basename(filename);

        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath, { recursive: true });
        }

        // Write file, verifying the resolved path stays inside savePath
        const fullPath = path.resolve(savePath, filename);
        const resolvedSavePath = path.resolve(savePath);
        if (
            !fullPath.startsWith(resolvedSavePath + path.sep) &&
            fullPath !== resolvedSavePath
        ) {
            throw new Error(
                "Invalid filename: resolved path escapes the save directory",
            );
        }
        fs.writeFileSync(fullPath, buffer);

        return {
            content: [
                {
                    type: "text",
                    text: `Attachment downloaded successfully:\nFile: ${filename}\nSize: ${buffer.length} bytes\nSaved to: ${fullPath}`,
                },
            ],
        };
    } catch (error: unknown) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to download attachment: ${errorMessage(error)}`,
                },
            ],
            isError: true,
        };
    }
}
