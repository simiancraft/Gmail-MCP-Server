import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { gmail_v1 } from "googleapis";
import {
    createFilter,
    deleteFilter,
    filterTemplates,
    formatFilterAction,
    formatFilterCriteria,
    type GmailFilterAction,
    type GmailFilterCriteria,
    getFilter,
    listFilters,
} from "../filter-manager.js";
import {
    CreateFilterFromTemplateSchema,
    CreateFilterSchema,
    DeleteFilterSchema,
    GetFilterSchema,
} from "../schemas.js";

type Gmail = gmail_v1.Gmail;

export async function handleCreateFilter(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = CreateFilterSchema.parse(args);
    const result = await createFilter(
        gmail,
        validatedArgs.criteria,
        validatedArgs.action,
    );

    const criteriaText = formatFilterCriteria(validatedArgs.criteria);
    const actionText = formatFilterAction(validatedArgs.action);

    return {
        content: [
            {
                type: "text",
                text: `Filter created successfully:\nID: ${result.id}\nCriteria: ${criteriaText}\nActions: ${actionText}`,
            },
        ],
    };
}

export async function handleListFilters(
    gmail: Gmail,
    _args: unknown,
): Promise<CallToolResult> {
    const result = await listFilters(gmail);
    const filters = result.filters;

    if (filters.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: "No filters found.",
                },
            ],
        };
    }

    const filtersText = filters
        .map((filter) => {
            const criteriaEntries = formatFilterCriteria(filter.criteria || {});
            const actionEntries = formatFilterAction(filter.action || {});
            return `ID: ${filter.id}\nCriteria: ${criteriaEntries}\nActions: ${actionEntries}\n`;
        })
        .join("\n");

    return {
        content: [
            {
                type: "text",
                text: `Found ${result.count} filters:\n\n${filtersText}`,
            },
        ],
    };
}

export async function handleGetFilter(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = GetFilterSchema.parse(args);
    const result = await getFilter(gmail, validatedArgs.filterId);

    const criteriaText = formatFilterCriteria(result.criteria || {});
    const actionText = formatFilterAction(result.action || {});

    return {
        content: [
            {
                type: "text",
                text: `Filter details:\nID: ${result.id}\nCriteria: ${criteriaText}\nActions: ${actionText}`,
            },
        ],
    };
}

export async function handleDeleteFilter(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = DeleteFilterSchema.parse(args);
    const result = await deleteFilter(gmail, validatedArgs.filterId);

    return {
        content: [
            {
                type: "text",
                text: result.message,
            },
        ],
    };
}

export async function handleCreateFilterFromTemplate(
    gmail: Gmail,
    args: unknown,
): Promise<CallToolResult> {
    const validatedArgs = CreateFilterFromTemplateSchema.parse(args);
    const template = validatedArgs.template;
    const params = validatedArgs.parameters;

    let filterConfig:
        | {
              criteria: GmailFilterCriteria;
              action: GmailFilterAction;
          }
        | undefined;

    switch (template) {
        case "fromSender":
            if (!params.senderEmail)
                throw new Error(
                    "senderEmail is required for fromSender template",
                );
            filterConfig = filterTemplates.fromSender(
                params.senderEmail,
                params.labelIds,
                params.archive,
            );
            break;
        case "withSubject":
            if (!params.subjectText)
                throw new Error(
                    "subjectText is required for withSubject template",
                );
            filterConfig = filterTemplates.withSubject(
                params.subjectText,
                params.labelIds,
                params.markAsRead,
            );
            break;
        case "withAttachments":
            filterConfig = filterTemplates.withAttachments(params.labelIds);
            break;
        case "largeEmails":
            if (!params.sizeInBytes)
                throw new Error(
                    "sizeInBytes is required for largeEmails template",
                );
            filterConfig = filterTemplates.largeEmails(
                params.sizeInBytes,
                params.labelIds,
            );
            break;
        case "containingText":
            if (!params.searchText)
                throw new Error(
                    "searchText is required for containingText template",
                );
            filterConfig = filterTemplates.containingText(
                params.searchText,
                params.labelIds,
                params.markImportant,
            );
            break;
        case "mailingList":
            if (!params.listIdentifier)
                throw new Error(
                    "listIdentifier is required for mailingList template",
                );
            filterConfig = filterTemplates.mailingList(
                params.listIdentifier,
                params.labelIds,
                params.archive,
            );
            break;
        default:
            throw new Error(`Unknown template: ${template}`);
    }

    const result = await createFilter(
        gmail,
        filterConfig.criteria,
        filterConfig.action,
    );

    return {
        content: [
            {
                type: "text",
                text: `Filter created from template '${template}':\nID: ${result.id}\nTemplate used: ${template}`,
            },
        ],
    };
}
