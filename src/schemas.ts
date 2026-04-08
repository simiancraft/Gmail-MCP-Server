import { z } from "zod";

export const SendEmailSchema = z.object({
    to: z.array(z.string()).describe("List of recipient email addresses"),
    subject: z.string().describe("Email subject"),
    body: z
        .string()
        .describe(
            "Email body content (used for text/plain or when htmlBody not provided)",
        ),
    htmlBody: z.string().optional().describe("HTML version of the email body"),
    mimeType: z
        .enum(["text/plain", "text/html", "multipart/alternative"])
        .optional()
        .default("text/plain")
        .describe("Email content type"),
    cc: z.array(z.string()).optional().describe("List of CC recipients"),
    bcc: z.array(z.string()).optional().describe("List of BCC recipients"),
    threadId: z.string().optional().describe("Thread ID to reply to"),
    inReplyTo: z.string().optional().describe("Message ID being replied to"),
    attachments: z
        .array(z.string())
        .optional()
        .describe("List of file paths to attach to the email"),
});
export type SendEmailArgs = z.infer<typeof SendEmailSchema>;

export const ReadEmailSchema = z.object({
    messageId: z.string().describe("ID of the email message to retrieve"),
});
export type ReadEmailArgs = z.infer<typeof ReadEmailSchema>;

export const SearchEmailsSchema = z.object({
    query: z
        .string()
        .describe("Gmail search query (e.g., 'from:example@gmail.com')"),
    maxResults: z
        .number()
        .optional()
        .describe("Maximum number of results to return"),
});
export type SearchEmailsArgs = z.infer<typeof SearchEmailsSchema>;

export const ModifyEmailSchema = z.object({
    messageId: z.string().describe("ID of the email message to modify"),
    labelIds: z
        .array(z.string())
        .optional()
        .describe("List of label IDs to apply"),
    addLabelIds: z
        .array(z.string())
        .optional()
        .describe("List of label IDs to add to the message"),
    removeLabelIds: z
        .array(z.string())
        .optional()
        .describe("List of label IDs to remove from the message"),
});
export type ModifyEmailArgs = z.infer<typeof ModifyEmailSchema>;

export const DeleteEmailSchema = z.object({
    messageId: z.string().describe("ID of the email message to delete"),
});
export type DeleteEmailArgs = z.infer<typeof DeleteEmailSchema>;

export const ListEmailLabelsSchema = z
    .object({})
    .describe("Retrieves all available Gmail labels");
export type ListEmailLabelsArgs = z.infer<typeof ListEmailLabelsSchema>;

export const CreateLabelSchema = z
    .object({
        name: z.string().describe("Name for the new label"),
        messageListVisibility: z
            .enum(["show", "hide"])
            .optional()
            .describe("Whether to show or hide the label in the message list"),
        labelListVisibility: z
            .enum(["labelShow", "labelShowIfUnread", "labelHide"])
            .optional()
            .describe("Visibility of the label in the label list"),
    })
    .describe("Creates a new Gmail label");
export type CreateLabelArgs = z.infer<typeof CreateLabelSchema>;

export const UpdateLabelSchema = z
    .object({
        id: z.string().describe("ID of the label to update"),
        name: z.string().optional().describe("New name for the label"),
        messageListVisibility: z
            .enum(["show", "hide"])
            .optional()
            .describe("Whether to show or hide the label in the message list"),
        labelListVisibility: z
            .enum(["labelShow", "labelShowIfUnread", "labelHide"])
            .optional()
            .describe("Visibility of the label in the label list"),
    })
    .describe("Updates an existing Gmail label");
export type UpdateLabelArgs = z.infer<typeof UpdateLabelSchema>;

export const DeleteLabelSchema = z
    .object({
        id: z.string().describe("ID of the label to delete"),
    })
    .describe("Deletes a Gmail label");
export type DeleteLabelArgs = z.infer<typeof DeleteLabelSchema>;

export const GetOrCreateLabelSchema = z
    .object({
        name: z.string().describe("Name of the label to get or create"),
        messageListVisibility: z
            .enum(["show", "hide"])
            .optional()
            .describe("Whether to show or hide the label in the message list"),
        labelListVisibility: z
            .enum(["labelShow", "labelShowIfUnread", "labelHide"])
            .optional()
            .describe("Visibility of the label in the label list"),
    })
    .describe(
        "Gets an existing label by name or creates it if it doesn't exist",
    );
export type GetOrCreateLabelArgs = z.infer<typeof GetOrCreateLabelSchema>;

export const BatchModifyEmailsSchema = z.object({
    messageIds: z.array(z.string()).describe("List of message IDs to modify"),
    addLabelIds: z
        .array(z.string())
        .optional()
        .describe("List of label IDs to add to all messages"),
    removeLabelIds: z
        .array(z.string())
        .optional()
        .describe("List of label IDs to remove from all messages"),
    batchSize: z
        .number()
        .optional()
        .default(50)
        .describe("Number of messages to process in each batch (default: 50)"),
});
export type BatchModifyEmailsArgs = z.infer<typeof BatchModifyEmailsSchema>;

export const BatchDeleteEmailsSchema = z.object({
    messageIds: z.array(z.string()).describe("List of message IDs to delete"),
    batchSize: z
        .number()
        .optional()
        .default(50)
        .describe("Number of messages to process in each batch (default: 50)"),
});
export type BatchDeleteEmailsArgs = z.infer<typeof BatchDeleteEmailsSchema>;

export const CreateFilterSchema = z
    .object({
        criteria: z
            .object({
                from: z
                    .string()
                    .optional()
                    .describe("Sender email address to match"),
                to: z
                    .string()
                    .optional()
                    .describe("Recipient email address to match"),
                subject: z
                    .string()
                    .optional()
                    .describe("Subject text to match"),
                query: z
                    .string()
                    .optional()
                    .describe("Gmail search query (e.g., 'has:attachment')"),
                negatedQuery: z
                    .string()
                    .optional()
                    .describe("Text that must NOT be present"),
                hasAttachment: z
                    .boolean()
                    .optional()
                    .describe("Whether to match emails with attachments"),
                excludeChats: z
                    .boolean()
                    .optional()
                    .describe("Whether to exclude chat messages"),
                size: z.number().optional().describe("Email size in bytes"),
                sizeComparison: z
                    .enum(["unspecified", "smaller", "larger"])
                    .optional()
                    .describe("Size comparison operator"),
            })
            .describe("Criteria for matching emails"),
        action: z
            .object({
                addLabelIds: z
                    .array(z.string())
                    .optional()
                    .describe("Label IDs to add to matching emails"),
                removeLabelIds: z
                    .array(z.string())
                    .optional()
                    .describe("Label IDs to remove from matching emails"),
                forward: z
                    .string()
                    .optional()
                    .describe("Email address to forward matching emails to"),
            })
            .describe("Actions to perform on matching emails"),
    })
    .describe("Creates a new Gmail filter");
export type CreateFilterArgs = z.infer<typeof CreateFilterSchema>;

export const ListFiltersSchema = z
    .object({})
    .describe("Retrieves all Gmail filters");
export type ListFiltersArgs = z.infer<typeof ListFiltersSchema>;

export const GetFilterSchema = z
    .object({
        filterId: z.string().describe("ID of the filter to retrieve"),
    })
    .describe("Gets details of a specific Gmail filter");
export type GetFilterArgs = z.infer<typeof GetFilterSchema>;

export const DeleteFilterSchema = z
    .object({
        filterId: z.string().describe("ID of the filter to delete"),
    })
    .describe("Deletes a Gmail filter");
export type DeleteFilterArgs = z.infer<typeof DeleteFilterSchema>;

export const CreateFilterFromTemplateSchema = z
    .object({
        template: z
            .enum([
                "fromSender",
                "withSubject",
                "withAttachments",
                "largeEmails",
                "containingText",
                "mailingList",
            ])
            .describe("Pre-defined filter template to use"),
        parameters: z
            .object({
                senderEmail: z
                    .string()
                    .optional()
                    .describe("Sender email (for fromSender template)"),
                subjectText: z
                    .string()
                    .optional()
                    .describe("Subject text (for withSubject template)"),
                searchText: z
                    .string()
                    .optional()
                    .describe(
                        "Text to search for (for containingText template)",
                    ),
                listIdentifier: z
                    .string()
                    .optional()
                    .describe(
                        "Mailing list identifier (for mailingList template)",
                    ),
                sizeInBytes: z
                    .number()
                    .optional()
                    .describe(
                        "Size threshold in bytes (for largeEmails template)",
                    ),
                labelIds: z
                    .array(z.string())
                    .optional()
                    .describe("Label IDs to apply"),
                archive: z
                    .boolean()
                    .optional()
                    .describe("Whether to archive (skip inbox)"),
                markAsRead: z
                    .boolean()
                    .optional()
                    .describe("Whether to mark as read"),
                markImportant: z
                    .boolean()
                    .optional()
                    .describe("Whether to mark as important"),
            })
            .describe("Template-specific parameters"),
    })
    .describe("Creates a filter using a pre-defined template");
export type CreateFilterFromTemplateArgs = z.infer<
    typeof CreateFilterFromTemplateSchema
>;

export const DownloadAttachmentSchema = z.object({
    messageId: z
        .string()
        .describe("ID of the email message containing the attachment"),
    attachmentId: z.string().describe("ID of the attachment to download"),
    filename: z
        .string()
        .optional()
        .describe(
            "Filename to save the attachment as (if not provided, uses original filename)",
        ),
    savePath: z
        .string()
        .optional()
        .describe(
            "Directory path to save the attachment (defaults to current directory)",
        ),
});
export type DownloadAttachmentArgs = z.infer<typeof DownloadAttachmentSchema>;
