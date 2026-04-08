import { describe, expect, test } from "bun:test";
import { extractEmailContent, type GmailMessagePart } from "./index.js";

describe("extractEmailContent", () => {
    test("extracts plain text from a simple text/plain part", () => {
        const part: GmailMessagePart = {
            mimeType: "text/plain",
            body: {
                data: Buffer.from("Hello, World!").toString("base64"),
            },
        };
        const result = extractEmailContent(part);
        expect(result.text).toBe("Hello, World!");
        expect(result.html).toBe("");
    });

    test("extracts HTML from a simple text/html part", () => {
        const part: GmailMessagePart = {
            mimeType: "text/html",
            body: {
                data: Buffer.from("<p>Hello</p>").toString("base64"),
            },
        };
        const result = extractEmailContent(part);
        expect(result.text).toBe("");
        expect(result.html).toBe("<p>Hello</p>");
    });

    test("extracts both text and HTML from multipart message", () => {
        const part: GmailMessagePart = {
            mimeType: "multipart/alternative",
            parts: [
                {
                    mimeType: "text/plain",
                    body: {
                        data: Buffer.from("Plain text").toString("base64"),
                    },
                },
                {
                    mimeType: "text/html",
                    body: {
                        data: Buffer.from("<b>HTML</b>").toString("base64"),
                    },
                },
            ],
        };
        const result = extractEmailContent(part);
        expect(result.text).toBe("Plain text");
        expect(result.html).toBe("<b>HTML</b>");
    });

    test("handles deeply nested multipart structures", () => {
        const part: GmailMessagePart = {
            mimeType: "multipart/mixed",
            parts: [
                {
                    mimeType: "multipart/alternative",
                    parts: [
                        {
                            mimeType: "text/plain",
                            body: {
                                data: Buffer.from("Deep text").toString(
                                    "base64",
                                ),
                            },
                        },
                        {
                            mimeType: "text/html",
                            body: {
                                data: Buffer.from("<i>Deep HTML</i>").toString(
                                    "base64",
                                ),
                            },
                        },
                    ],
                },
            ],
        };
        const result = extractEmailContent(part);
        expect(result.text).toBe("Deep text");
        expect(result.html).toBe("<i>Deep HTML</i>");
    });

    test("returns empty strings for part with no body data", () => {
        const part: GmailMessagePart = {
            mimeType: "text/plain",
        };
        const result = extractEmailContent(part);
        expect(result.text).toBe("");
        expect(result.html).toBe("");
    });

    test("returns empty strings for empty object", () => {
        const result = extractEmailContent({});
        expect(result.text).toBe("");
        expect(result.html).toBe("");
    });

    test("concatenates text from multiple text/plain parts", () => {
        const part: GmailMessagePart = {
            mimeType: "multipart/mixed",
            parts: [
                {
                    mimeType: "text/plain",
                    body: {
                        data: Buffer.from("Part 1").toString("base64"),
                    },
                },
                {
                    mimeType: "text/plain",
                    body: {
                        data: Buffer.from("Part 2").toString("base64"),
                    },
                },
            ],
        };
        const result = extractEmailContent(part);
        expect(result.text).toBe("Part 1Part 2");
    });

    test("skips attachment parts (no text/html mimeType)", () => {
        const part: GmailMessagePart = {
            mimeType: "multipart/mixed",
            parts: [
                {
                    mimeType: "text/plain",
                    body: {
                        data: Buffer.from("Body text").toString("base64"),
                    },
                },
                {
                    mimeType: "application/pdf",
                    filename: "doc.pdf",
                    body: {
                        attachmentId: "att123",
                        size: 1024,
                    },
                },
            ],
        };
        const result = extractEmailContent(part);
        expect(result.text).toBe("Body text");
        expect(result.html).toBe("");
    });
});
