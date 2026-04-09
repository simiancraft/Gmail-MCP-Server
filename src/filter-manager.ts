/**
 * Filter Manager for Gmail MCP Server
 * Provides comprehensive filter management functionality
 */

import type { gmail_v1 } from "googleapis";
import { errorMessage } from "./utl.js";

type Gmail = gmail_v1.Gmail;
export type GmailFilter = gmail_v1.Schema$Filter;
export type GmailFilterCriteria = gmail_v1.Schema$FilterCriteria;
export type GmailFilterAction = gmail_v1.Schema$FilterAction;

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
 * Creates a new Gmail filter
 */
export async function createFilter(
    gmail: Gmail,
    criteria: GmailFilterCriteria,
    action: GmailFilterAction,
): Promise<GmailFilter> {
    try {
        const response = await gmail.users.settings.filters.create({
            userId: "me",
            requestBody: { criteria, action },
        });
        return response.data;
    } catch (error: unknown) {
        const msg = errorMessage(error);
        if (errorCode(error) === 400) {
            throw new Error(`Invalid filter criteria or action: ${msg}`);
        }
        throw new Error(`Failed to create filter: ${msg}`);
    }
}

/**
 * Lists all Gmail filters
 */
export async function listFilters(
    gmail: Gmail,
): Promise<{ filters: GmailFilter[]; count: number }> {
    try {
        const response = await gmail.users.settings.filters.list({
            userId: "me",
        });
        const filters: GmailFilter[] = response.data.filter || [];
        return { filters, count: filters.length };
    } catch (error: unknown) {
        throw new Error(`Failed to list filters: ${errorMessage(error)}`);
    }
}

/**
 * Gets a specific Gmail filter by ID
 */
export async function getFilter(
    gmail: Gmail,
    filterId: string,
): Promise<GmailFilter> {
    try {
        const response = await gmail.users.settings.filters.get({
            userId: "me",
            id: filterId,
        });
        return response.data;
    } catch (error: unknown) {
        if (errorCode(error) === 404) {
            throw new Error(`Filter with ID "${filterId}" not found.`);
        }
        throw new Error(`Failed to get filter: ${errorMessage(error)}`);
    }
}

/**
 * Deletes a Gmail filter
 */
export async function deleteFilter(
    gmail: Gmail,
    filterId: string,
): Promise<{ success: true; message: string }> {
    try {
        await gmail.users.settings.filters.delete({
            userId: "me",
            id: filterId,
        });
        return {
            success: true,
            message: `Filter "${filterId}" deleted successfully.`,
        };
    } catch (error: unknown) {
        if (errorCode(error) === 404) {
            throw new Error(`Filter with ID "${filterId}" not found.`);
        }
        throw new Error(`Failed to delete filter: ${errorMessage(error)}`);
    }
}

/**
 * Helper function to create common filter patterns
 */
export const filterTemplates = {
    /**
     * Filter emails from a specific sender
     */
    fromSender: (
        senderEmail: string,
        labelIds: string[] = [],
        archive: boolean = false,
    ): { criteria: GmailFilterCriteria; action: GmailFilterAction } => ({
        criteria: { from: senderEmail },
        action: {
            addLabelIds: labelIds,
            removeLabelIds: archive ? ["INBOX"] : undefined,
        },
    }),

    /**
     * Filter emails with specific subject
     */
    withSubject: (
        subjectText: string,
        labelIds: string[] = [],
        markAsRead: boolean = false,
    ): { criteria: GmailFilterCriteria; action: GmailFilterAction } => ({
        criteria: { subject: subjectText },
        action: {
            addLabelIds: labelIds,
            removeLabelIds: markAsRead ? ["UNREAD"] : undefined,
        },
    }),

    /**
     * Filter emails with attachments
     */
    withAttachments: (
        labelIds: string[] = [],
    ): { criteria: GmailFilterCriteria; action: GmailFilterAction } => ({
        criteria: { hasAttachment: true },
        action: { addLabelIds: labelIds },
    }),

    /**
     * Filter large emails
     */
    largeEmails: (
        sizeInBytes: number,
        labelIds: string[] = [],
    ): { criteria: GmailFilterCriteria; action: GmailFilterAction } => ({
        criteria: { size: sizeInBytes, sizeComparison: "larger" },
        action: { addLabelIds: labelIds },
    }),

    /**
     * Filter emails containing specific text
     */
    containingText: (
        searchText: string,
        labelIds: string[] = [],
        markImportant: boolean = false,
    ): { criteria: GmailFilterCriteria; action: GmailFilterAction } => ({
        criteria: { query: `"${searchText}"` },
        action: {
            addLabelIds: markImportant ? [...labelIds, "IMPORTANT"] : labelIds,
        },
    }),

    /**
     * Filter mailing list emails (common patterns)
     */
    mailingList: (
        listIdentifier: string,
        labelIds: string[] = [],
        archive: boolean = true,
    ): { criteria: GmailFilterCriteria; action: GmailFilterAction } => ({
        criteria: {
            query: `list:${listIdentifier} OR subject:[${listIdentifier}]`,
        },
        action: {
            addLabelIds: labelIds,
            removeLabelIds: archive ? ["INBOX"] : undefined,
        },
    }),
};

export function formatFilterCriteria(criteria: GmailFilterCriteria): string {
    return Object.entries(criteria)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
}

export function formatFilterAction(action: GmailFilterAction): string {
    return Object.entries(action)
        .filter(
            ([_, value]) =>
                value !== undefined &&
                value !== null &&
                (Array.isArray(value) ? value.length > 0 : true),
        )
        .map(
            ([key, value]) =>
                `${key}: ${Array.isArray(value) ? value.join(", ") : value}`,
        )
        .join(", ");
}
