/**
 * Label Manager for Gmail MCP Server
 * Provides comprehensive label management functionality
 */

import type { gmail_v1 } from "googleapis";
import { errorMessage } from "./utl.js";

type Gmail = gmail_v1.Gmail;
export type GmailLabel = gmail_v1.Schema$Label;

interface LabelVisibilityOptions {
    messageListVisibility?: string;
    labelListVisibility?: string;
}

function errorCode(error: unknown): number | undefined {
    if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "number"
    ) {
        return (error as { code: number }).code;
    }
    return undefined;
}

/**
 * Creates a new Gmail label
 */
export async function createLabel(
    gmail: Gmail,
    labelName: string,
    options: LabelVisibilityOptions = {},
): Promise<GmailLabel> {
    try {
        const messageListVisibility = options.messageListVisibility || "show";
        const labelListVisibility = options.labelListVisibility || "labelShow";

        const response = await gmail.users.labels.create({
            userId: "me",
            requestBody: {
                name: labelName,
                messageListVisibility,
                labelListVisibility,
            },
        });

        return response.data;
    } catch (error: unknown) {
        const msg = errorMessage(error);
        if (msg.includes("already exists")) {
            throw new Error(
                `Label "${labelName}" already exists. Please use a different name.`,
            );
        }
        throw new Error(`Failed to create label: ${msg}`);
    }
}

/**
 * Updates an existing Gmail label
 */
export async function updateLabel(
    gmail: Gmail,
    labelId: string,
    updates: {
        name?: string;
        messageListVisibility?: string;
        labelListVisibility?: string;
    },
): Promise<GmailLabel> {
    try {
        // Verify the label exists before updating
        await gmail.users.labels.get({
            userId: "me",
            id: labelId,
        });

        const response = await gmail.users.labels.update({
            userId: "me",
            id: labelId,
            requestBody: updates,
        });

        return response.data;
    } catch (error: unknown) {
        if (errorCode(error) === 404) {
            throw new Error(`Label with ID "${labelId}" not found.`);
        }
        throw new Error(`Failed to update label: ${errorMessage(error)}`);
    }
}

/**
 * Deletes a Gmail label
 */
export async function deleteLabel(
    gmail: Gmail,
    labelId: string,
): Promise<{ success: true; message: string }> {
    try {
        // Ensure we're not trying to delete system labels
        const label = await gmail.users.labels.get({
            userId: "me",
            id: labelId,
        });

        if (label.data.type === "system") {
            throw new Error(`Cannot delete system label with ID "${labelId}".`);
        }

        await gmail.users.labels.delete({
            userId: "me",
            id: labelId,
        });

        return {
            success: true,
            message: `Label "${label.data.name}" deleted successfully.`,
        };
    } catch (error: unknown) {
        if (errorCode(error) === 404) {
            throw new Error(`Label with ID "${labelId}" not found.`);
        }
        throw new Error(`Failed to delete label: ${errorMessage(error)}`);
    }
}

export interface ListLabelsResult {
    all: GmailLabel[];
    system: GmailLabel[];
    user: GmailLabel[];
    count: {
        total: number;
        system: number;
        user: number;
    };
}

/**
 * Gets a detailed list of all Gmail labels
 */
export async function listLabels(gmail: Gmail): Promise<ListLabelsResult> {
    try {
        const response = await gmail.users.labels.list({
            userId: "me",
        });

        const labels: GmailLabel[] = response.data.labels || [];

        const systemLabels = labels.filter((label) => label.type === "system");
        const userLabels = labels.filter((label) => label.type === "user");

        return {
            all: labels,
            system: systemLabels,
            user: userLabels,
            count: {
                total: labels.length,
                system: systemLabels.length,
                user: userLabels.length,
            },
        };
    } catch (error: unknown) {
        throw new Error(`Failed to list labels: ${errorMessage(error)}`);
    }
}

/**
 * Finds a label by name (case-insensitive)
 */
export async function findLabelByName(
    gmail: Gmail,
    labelName: string,
): Promise<GmailLabel | null> {
    try {
        const labelsResponse = await listLabels(gmail);
        const foundLabel = labelsResponse.all.find(
            (label) => label.name?.toLowerCase() === labelName.toLowerCase(),
        );
        return foundLabel || null;
    } catch (error: unknown) {
        throw new Error(`Failed to find label: ${errorMessage(error)}`);
    }
}

/**
 * Creates label if it doesn't exist or returns existing label
 */
export async function getOrCreateLabel(
    gmail: Gmail,
    labelName: string,
    options: LabelVisibilityOptions = {},
): Promise<{ label: GmailLabel; created: boolean }> {
    try {
        const existingLabel = await findLabelByName(gmail, labelName);

        if (existingLabel) {
            return { label: existingLabel, created: false };
        }

        const newLabel = await createLabel(gmail, labelName, options);
        return { label: newLabel, created: true };
    } catch (error: unknown) {
        throw new Error(
            `Failed to get or create label: ${errorMessage(error)}`,
        );
    }
}
