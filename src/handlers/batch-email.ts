import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { gmail_v1 } from "googleapis";
import { processBatches } from "../batch.js";
import {
    BatchDeleteEmailsSchema,
    BatchModifyEmailsSchema,
} from "../schemas.js";

type Gmail = gmail_v1.Gmail;

export async function handleBatchModifyEmails(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = BatchModifyEmailsSchema.parse(args);
    const messageIds = validatedArgs.messageIds;
    const batchSize = validatedArgs.batchSize || 50;

    const requestBody: gmail_v1.Schema$ModifyMessageRequest = {};
    if (validatedArgs.addLabelIds) {
        requestBody.addLabelIds = validatedArgs.addLabelIds;
    }
    if (validatedArgs.removeLabelIds) {
        requestBody.removeLabelIds = validatedArgs.removeLabelIds;
    }

    const { successes, failures } = await processBatches(
        messageIds,
        batchSize,
        async (batch) => {
            return Promise.all(
                batch.map(async (messageId) => {
                    await gmail.users.messages.modify({
                        userId: "me",
                        id: messageId,
                        requestBody,
                    });
                    return { messageId, success: true };
                }),
            );
        },
    );

    const successCount = successes.length;
    const failureCount = failures.length;

    let resultText = "Batch label modification complete.\n";
    resultText += `Successfully processed: ${successCount} messages\n`;

    if (failureCount > 0) {
        resultText += `Failed to process: ${failureCount} messages\n\n`;
        resultText += "Failed message IDs:\n";
        resultText += failures
            .map(
                (f) =>
                    `- ${(f.item as string).substring(0, 16)}... (${f.error.message})`,
            )
            .join("\n");
    }

    return {
        content: [{ type: "text", text: resultText }],
    };
}

export async function handleBatchDeleteEmails(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = BatchDeleteEmailsSchema.parse(args);
    const messageIds = validatedArgs.messageIds;
    const batchSize = validatedArgs.batchSize || 50;

    const { successes, failures } = await processBatches(
        messageIds,
        batchSize,
        async (batch) => {
            return Promise.all(
                batch.map(async (messageId) => {
                    await gmail.users.messages.delete({
                        userId: "me",
                        id: messageId,
                    });
                    return { messageId, success: true };
                }),
            );
        },
    );

    const successCount = successes.length;
    const failureCount = failures.length;

    let resultText = "Batch delete operation complete.\n";
    resultText += `Successfully deleted: ${successCount} messages\n`;

    if (failureCount > 0) {
        resultText += `Failed to delete: ${failureCount} messages\n\n`;
        resultText += "Failed message IDs:\n";
        resultText += failures
            .map(
                (f) =>
                    `- ${(f.item as string).substring(0, 16)}... (${f.error.message})`,
            )
            .join("\n");
    }

    return {
        content: [{ type: "text", text: resultText }],
    };
}
