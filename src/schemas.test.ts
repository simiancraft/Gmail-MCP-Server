import { describe, expect, test } from "bun:test";
import {
    BatchDeleteEmailsSchema,
    BatchModifyEmailsSchema,
    CreateFilterFromTemplateSchema,
    CreateFilterSchema,
    DeleteEmailSchema,
    DownloadAttachmentSchema,
    ModifyEmailSchema,
    ReadEmailSchema,
    SearchEmailsSchema,
    SendEmailSchema,
} from "./schemas.js";

describe("SendEmailSchema", () => {
    test("parses valid minimal input", () => {
        const result = SendEmailSchema.parse({
            to: ["a@b.com"],
            subject: "Hi",
            body: "Hello",
        });
        expect(result.to).toEqual(["a@b.com"]);
        expect(result.subject).toBe("Hi");
        expect(result.body).toBe("Hello");
    });

    test("defaults mimeType to text/plain", () => {
        const result = SendEmailSchema.parse({
            to: ["a@b.com"],
            subject: "Hi",
            body: "Hello",
        });
        expect(result.mimeType).toBe("text/plain");
    });

    test("accepts explicit mimeType", () => {
        const result = SendEmailSchema.parse({
            to: ["a@b.com"],
            subject: "Hi",
            body: "Hello",
            mimeType: "text/html",
        });
        expect(result.mimeType).toBe("text/html");
    });

    test("rejects missing required fields", () => {
        expect(() => SendEmailSchema.parse({})).toThrow();
        expect(() => SendEmailSchema.parse({ to: ["a@b.com"] })).toThrow();
        expect(() =>
            SendEmailSchema.parse({ to: ["a@b.com"], subject: "Hi" }),
        ).toThrow();
    });

    test("optional fields are undefined when omitted", () => {
        const result = SendEmailSchema.parse({
            to: ["a@b.com"],
            subject: "Hi",
            body: "Hello",
        });
        expect(result.cc).toBeUndefined();
        expect(result.bcc).toBeUndefined();
        expect(result.threadId).toBeUndefined();
        expect(result.inReplyTo).toBeUndefined();
        expect(result.attachments).toBeUndefined();
        expect(result.htmlBody).toBeUndefined();
    });
});

describe("ReadEmailSchema", () => {
    test("parses valid input", () => {
        const result = ReadEmailSchema.parse({ messageId: "abc123" });
        expect(result.messageId).toBe("abc123");
    });

    test("rejects missing messageId", () => {
        expect(() => ReadEmailSchema.parse({})).toThrow();
    });
});

describe("SearchEmailsSchema", () => {
    test("parses with just a query", () => {
        const result = SearchEmailsSchema.parse({
            query: "from:test@example.com",
        });
        expect(result.query).toBe("from:test@example.com");
        expect(result.maxResults).toBeUndefined();
    });

    test("accepts optional maxResults", () => {
        const result = SearchEmailsSchema.parse({
            query: "is:unread",
            maxResults: 5,
        });
        expect(result.maxResults).toBe(5);
    });
});

describe("ModifyEmailSchema", () => {
    test("parses with just messageId", () => {
        const result = ModifyEmailSchema.parse({ messageId: "msg1" });
        expect(result.messageId).toBe("msg1");
    });

    test("accepts labelIds, addLabelIds, and removeLabelIds", () => {
        const result = ModifyEmailSchema.parse({
            messageId: "msg1",
            labelIds: ["L1"],
            addLabelIds: ["L2"],
            removeLabelIds: ["L3"],
        });
        expect(result.labelIds).toEqual(["L1"]);
        expect(result.addLabelIds).toEqual(["L2"]);
        expect(result.removeLabelIds).toEqual(["L3"]);
    });
});

describe("DeleteEmailSchema", () => {
    test("parses valid input", () => {
        const result = DeleteEmailSchema.parse({ messageId: "del1" });
        expect(result.messageId).toBe("del1");
    });
});

describe("BatchModifyEmailsSchema", () => {
    test("defaults batchSize to 50", () => {
        const result = BatchModifyEmailsSchema.parse({
            messageIds: ["a", "b"],
        });
        expect(result.batchSize).toBe(50);
    });

    test("accepts explicit batchSize", () => {
        const result = BatchModifyEmailsSchema.parse({
            messageIds: ["a"],
            batchSize: 10,
        });
        expect(result.batchSize).toBe(10);
    });

    test("rejects missing messageIds", () => {
        expect(() => BatchModifyEmailsSchema.parse({})).toThrow();
    });
});

describe("BatchDeleteEmailsSchema", () => {
    test("defaults batchSize to 50", () => {
        const result = BatchDeleteEmailsSchema.parse({
            messageIds: ["a"],
        });
        expect(result.batchSize).toBe(50);
    });

    test("accepts explicit batchSize", () => {
        const result = BatchDeleteEmailsSchema.parse({
            messageIds: ["a"],
            batchSize: 25,
        });
        expect(result.batchSize).toBe(25);
    });
});

describe("DownloadAttachmentSchema", () => {
    test("parses with required fields only", () => {
        const result = DownloadAttachmentSchema.parse({
            messageId: "m1",
            attachmentId: "a1",
        });
        expect(result.messageId).toBe("m1");
        expect(result.attachmentId).toBe("a1");
        expect(result.filename).toBeUndefined();
        expect(result.savePath).toBeUndefined();
    });

    test("accepts optional filename and savePath", () => {
        const result = DownloadAttachmentSchema.parse({
            messageId: "m1",
            attachmentId: "a1",
            filename: "doc.pdf",
            savePath: "/tmp/downloads",
        });
        expect(result.filename).toBe("doc.pdf");
        expect(result.savePath).toBe("/tmp/downloads");
    });
});

describe("CreateFilterSchema", () => {
    test("parses with minimal criteria and action", () => {
        const result = CreateFilterSchema.parse({
            criteria: { from: "test@example.com" },
            action: { addLabelIds: ["L1"] },
        });
        expect(result.criteria.from).toBe("test@example.com");
        expect(result.action.addLabelIds).toEqual(["L1"]);
    });

    test("accepts complex criteria", () => {
        const result = CreateFilterSchema.parse({
            criteria: {
                from: "a@b.com",
                subject: "Important",
                hasAttachment: true,
                size: 1000000,
                sizeComparison: "larger",
            },
            action: {
                addLabelIds: ["L1"],
                removeLabelIds: ["INBOX"],
                forward: "other@example.com",
            },
        });
        expect(result.criteria.hasAttachment).toBe(true);
        expect(result.criteria.sizeComparison).toBe("larger");
        expect(result.action.forward).toBe("other@example.com");
    });
});

describe("CreateFilterFromTemplateSchema", () => {
    test("accepts valid template names", () => {
        const templates = [
            "fromSender",
            "withSubject",
            "withAttachments",
            "largeEmails",
            "containingText",
            "mailingList",
        ] as const;
        for (const template of templates) {
            const result = CreateFilterFromTemplateSchema.parse({
                template,
                parameters: {},
            });
            expect(result.template).toBe(template);
        }
    });

    test("rejects invalid template name", () => {
        expect(() =>
            CreateFilterFromTemplateSchema.parse({
                template: "nonexistent",
                parameters: {},
            }),
        ).toThrow();
    });
});
