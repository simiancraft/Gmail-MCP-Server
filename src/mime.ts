import type { gmail_v1 } from "googleapis";

export type GmailMessagePart = gmail_v1.Schema$MessagePart;

export interface EmailAttachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
}

export interface EmailContent {
    text: string;
    html: string;
}

/**
 * Recursively extract email body content from MIME message parts.
 * Handles complex email structures with nested parts.
 */
export function extractEmailContent(
    messagePart: GmailMessagePart,
): EmailContent {
    let textContent = "";
    let htmlContent = "";

    // If the part has a body with data, process it based on MIME type
    if (messagePart.body?.data) {
        const content = Buffer.from(messagePart.body.data, "base64").toString(
            "utf8",
        );

        if (messagePart.mimeType === "text/plain") {
            textContent = content;
        } else if (messagePart.mimeType === "text/html") {
            htmlContent = content;
        }
    }

    // If the part has nested parts, recursively process them
    if (messagePart.parts && messagePart.parts.length > 0) {
        for (const part of messagePart.parts) {
            const { text, html } = extractEmailContent(part);
            if (text) textContent += text;
            if (html) htmlContent += html;
        }
    }

    return { text: textContent, html: htmlContent };
}

/**
 * Recursively walk a MIME tree and collect attachment metadata.
 */
export function collectAttachments(
    part: GmailMessagePart | undefined,
): EmailAttachment[] {
    if (!part) return [];
    const attachments: EmailAttachment[] = [];

    const walk = (p: GmailMessagePart) => {
        if (p.body?.attachmentId) {
            attachments.push({
                id: p.body.attachmentId,
                filename: p.filename || `attachment-${p.body.attachmentId}`,
                mimeType: p.mimeType || "application/octet-stream",
                size: p.body.size || 0,
            });
        }
        if (p.parts) {
            for (const sub of p.parts) walk(sub);
        }
    };

    walk(part);
    return attachments;
}

/**
 * Recursively search a MIME tree for an attachment by ID and return its
 * original filename, or null if not found.
 */
export function findAttachmentFilename(
    part: GmailMessagePart | undefined,
    attachmentId: string,
): string | null {
    if (!part) return null;
    if (part.body?.attachmentId === attachmentId) {
        return part.filename || `attachment-${attachmentId}`;
    }
    if (part.parts) {
        for (const subpart of part.parts) {
            const found = findAttachmentFilename(subpart, attachmentId);
            if (found) return found;
        }
    }
    return null;
}
