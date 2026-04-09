import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { gmail_v1 } from "googleapis";
import { collectAttachments, extractEmailContent } from "../mime.js";
import {
    DeleteEmailSchema,
    ModifyEmailSchema,
    ReadEmailSchema,
    SearchEmailsSchema,
    type SendEmailArgs,
    SendEmailSchema,
} from "../schemas.js";
import {
    createEmailMessage,
    createEmailWithNodemailer,
    encodeBase64Url,
    errorMessage,
} from "../utl.js";

type Gmail = gmail_v1.Gmail;

type EmailAction = "send" | "draft";

/**
 * Shared implementation for send_email and draft_email. Routes through
 * nodemailer when attachments are present so we get proper RFC 822
 * multipart encoding, and through the simpler manual builder otherwise.
 */
async function handleEmailAction(
    gmail: Gmail,
    action: EmailAction,
    validatedArgs: SendEmailArgs,
): Promise<CallToolResult> {
    let message: string;

    try {
        if (validatedArgs.attachments && validatedArgs.attachments.length > 0) {
            // Use Nodemailer to create properly formatted RFC822 message
            message = await createEmailWithNodemailer(validatedArgs);

            const encodedMessage = encodeBase64Url(message);

            if (action === "send") {
                const result = await gmail.users.messages.send({
                    userId: "me",
                    requestBody: {
                        raw: encodedMessage,
                        ...(validatedArgs.threadId && {
                            threadId: validatedArgs.threadId,
                        }),
                    },
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Email sent successfully with ID: ${result.data.id}`,
                        },
                    ],
                };
            }

            const response = await gmail.users.drafts.create({
                userId: "me",
                requestBody: {
                    message: {
                        raw: encodedMessage,
                        ...(validatedArgs.threadId && {
                            threadId: validatedArgs.threadId,
                        }),
                    },
                },
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Email draft created successfully with ID: ${response.data.id}`,
                    },
                ],
            };
        }

        // For emails without attachments, use the simple manual builder
        message = createEmailMessage(validatedArgs);
        const encodedMessage = encodeBase64Url(message);

        const messageRequest: gmail_v1.Schema$Message = {
            raw: encodedMessage,
        };
        if (validatedArgs.threadId) {
            messageRequest.threadId = validatedArgs.threadId;
        }

        if (action === "send") {
            const response = await gmail.users.messages.send({
                userId: "me",
                requestBody: messageRequest,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Email sent successfully with ID: ${response.data.id}`,
                    },
                ],
            };
        }

        const response = await gmail.users.drafts.create({
            userId: "me",
            requestBody: { message: messageRequest },
        });
        return {
            content: [
                {
                    type: "text",
                    text: `Email draft created successfully with ID: ${response.data.id}`,
                },
            ],
        };
    } catch (error: unknown) {
        if (validatedArgs.attachments && validatedArgs.attachments.length > 0) {
            console.error(
                `Failed to send email with ${validatedArgs.attachments.length} attachments:`,
                errorMessage(error),
            );
        }
        throw error;
    }
}

export async function handleSendEmail(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    return handleEmailAction(gmail, "send", SendEmailSchema.parse(args));
}

export async function handleDraftEmail(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    return handleEmailAction(gmail, "draft", SendEmailSchema.parse(args));
}

export async function handleReadEmail(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = ReadEmailSchema.parse(args);
    const response = await gmail.users.messages.get({
        userId: "me",
        id: validatedArgs.messageId,
        format: "full",
    });

    const headers = response.data.payload?.headers || [];
    const subject =
        headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
    const from =
        headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
    const to = headers.find((h) => h.name?.toLowerCase() === "to")?.value || "";
    const date =
        headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";
    const threadId = response.data.threadId || "";

    const { text, html } = extractEmailContent(response.data.payload ?? {});
    const attachments = collectAttachments(response.data.payload ?? undefined);

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(
                    {
                        messageId: validatedArgs.messageId,
                        threadId,
                        subject,
                        from,
                        to,
                        date,
                        body: {
                            text: text || null,
                            html: html || null,
                        },
                        attachments,
                    },
                    null,
                    2,
                ),
            },
        ],
    };
}

export async function handleSearchEmails(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = SearchEmailsSchema.parse(args);
    const response = await gmail.users.messages.list({
        userId: "me",
        q: validatedArgs.query,
        maxResults: validatedArgs.maxResults || 10,
    });

    const messages = response.data.messages || [];
    const results = await Promise.all(
        messages.map(async (msg) => {
            const detail = await gmail.users.messages.get({
                userId: "me",
                id: msg.id ?? "",
                format: "metadata",
                metadataHeaders: ["Subject", "From", "Date"],
            });
            const headers = detail.data.payload?.headers || [];
            return {
                id: msg.id,
                subject: headers.find((h) => h.name === "Subject")?.value || "",
                from: headers.find((h) => h.name === "From")?.value || "",
                date: headers.find((h) => h.name === "Date")?.value || "",
            };
        }),
    );

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(results, null, 2),
            },
        ],
    };
}

export async function handleModifyEmail(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = ModifyEmailSchema.parse(args);

    const requestBody: gmail_v1.Schema$ModifyMessageRequest = {};

    // addLabelIds takes precedence; labelIds only applies when addLabelIds absent
    if (validatedArgs.addLabelIds) {
        requestBody.addLabelIds = validatedArgs.addLabelIds;
    } else if (validatedArgs.labelIds) {
        requestBody.addLabelIds = validatedArgs.labelIds;
    }

    if (validatedArgs.removeLabelIds) {
        requestBody.removeLabelIds = validatedArgs.removeLabelIds;
    }

    await gmail.users.messages.modify({
        userId: "me",
        id: validatedArgs.messageId,
        requestBody,
    });

    return {
        content: [
            {
                type: "text",
                text: `Email ${validatedArgs.messageId} labels updated successfully`,
            },
        ],
    };
}

export async function handleDeleteEmail(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = DeleteEmailSchema.parse(args);
    await gmail.users.messages.delete({
        userId: "me",
        id: validatedArgs.messageId,
    });

    return {
        content: [
            {
                type: "text",
                text: `Email ${validatedArgs.messageId} deleted successfully`,
            },
        ],
    };
}
