import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { gmail_v1 } from "googleapis";
import {
    createLabel,
    deleteLabel,
    getOrCreateLabel,
    listLabels,
    updateLabel,
} from "../label-manager.js";
import {
    CreateLabelSchema,
    DeleteLabelSchema,
    GetOrCreateLabelSchema,
    UpdateLabelSchema,
} from "../schemas.js";

type Gmail = gmail_v1.Gmail;

export async function handleListLabels(
    gmail: Gmail,
    _args: unknown,
): Promise<CallToolResult> {
    const labelResults = await listLabels(gmail);
    const systemLabels = labelResults.system;
    const userLabels = labelResults.user;

    return {
        content: [
            {
                type: "text",
                text:
                    `Found ${labelResults.count.total} labels (${labelResults.count.system} system, ${labelResults.count.user} user):\n\n` +
                    "System Labels:\n" +
                    systemLabels
                        .map((l) => `ID: ${l.id}\nName: ${l.name}\n`)
                        .join("\n") +
                    "\nUser Labels:\n" +
                    userLabels
                        .map((l) => `ID: ${l.id}\nName: ${l.name}\n`)
                        .join("\n"),
            },
        ],
    };
}

export async function handleCreateLabel(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = CreateLabelSchema.parse(args);
    const result = await createLabel(gmail, validatedArgs.name, {
        messageListVisibility: validatedArgs.messageListVisibility,
        labelListVisibility: validatedArgs.labelListVisibility,
    });

    return {
        content: [
            {
                type: "text",
                text: `Label created successfully:\nID: ${result.id}\nName: ${result.name}\nType: ${result.type}`,
            },
        ],
    };
}

export async function handleUpdateLabel(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = UpdateLabelSchema.parse(args);

    const updates: {
        name?: string;
        messageListVisibility?: string;
        labelListVisibility?: string;
    } = {};
    if (validatedArgs.name) updates.name = validatedArgs.name;
    if (validatedArgs.messageListVisibility)
        updates.messageListVisibility = validatedArgs.messageListVisibility;
    if (validatedArgs.labelListVisibility)
        updates.labelListVisibility = validatedArgs.labelListVisibility;

    const result = await updateLabel(gmail, validatedArgs.id, updates);

    return {
        content: [
            {
                type: "text",
                text: `Label updated successfully:\nID: ${result.id}\nName: ${result.name}\nType: ${result.type}`,
            },
        ],
    };
}

export async function handleDeleteLabel(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = DeleteLabelSchema.parse(args);
    const result = await deleteLabel(gmail, validatedArgs.id);

    return {
        content: [
            {
                type: "text",
                text: result.message,
            },
        ],
    };
}

export async function handleGetOrCreateLabel(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = GetOrCreateLabelSchema.parse(args);
    const { label, created } = await getOrCreateLabel(
        gmail,
        validatedArgs.name,
        {
            messageListVisibility: validatedArgs.messageListVisibility,
            labelListVisibility: validatedArgs.labelListVisibility,
        },
    );

    const action = created ? "created new" : "found existing";

    return {
        content: [
            {
                type: "text",
                text: `Successfully ${action} label:\nID: ${label.id}\nName: ${label.name}\nType: ${label.type}`,
            },
        ],
    };
}
