import { describe, expect, test } from "bun:test";
import { createEmailMessage, encodeBase64Url, validateEmail } from "./utl.js";

describe("validateEmail", () => {
    test("accepts valid email addresses", () => {
        expect(validateEmail("user@example.com")).toBe(true);
        expect(validateEmail("user+tag@example.com")).toBe(true);
        expect(validateEmail("a@b.co")).toBe(true);
        expect(validateEmail("first.last@domain.org")).toBe(true);
    });

    test("rejects invalid email addresses", () => {
        expect(validateEmail("")).toBe(false);
        expect(validateEmail("not-an-email")).toBe(false);
        expect(validateEmail("@no-local.com")).toBe(false);
        expect(validateEmail("no-domain@")).toBe(false);
        expect(validateEmail("spaces in@here.com")).toBe(false);
    });
});

describe("encodeBase64Url", () => {
    test("produces URL-safe base64 with no padding", () => {
        const result = encodeBase64Url("Hello, World!");
        expect(result).not.toContain("+");
        expect(result).not.toContain("/");
        expect(result).not.toContain("=");
    });

    test("round-trips through decode", () => {
        const input = "test message content with special chars: +/=";
        const encoded = encodeBase64Url(input);
        // Reverse the URL-safe encoding to standard base64
        const standard = encoded.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = Buffer.from(standard, "base64").toString("utf8");
        expect(decoded).toBe(input);
    });

    test("handles empty string", () => {
        expect(encodeBase64Url("")).toBe("");
    });
});

describe("createEmailMessage", () => {
    const baseArgs = {
        to: ["recipient@example.com"],
        subject: "Test Subject",
        body: "Hello, this is a test.",
        mimeType: "text/plain" as const,
    };

    test("creates a plain text email with correct headers", () => {
        const result = createEmailMessage(baseArgs);
        expect(result).toContain("To: recipient@example.com");
        expect(result).toContain("Subject: Test Subject");
        expect(result).toContain("Content-Type: text/plain; charset=UTF-8");
        expect(result).toContain("Hello, this is a test.");
        expect(result).toContain("MIME-Version: 1.0");
    });

    test("creates an HTML email", () => {
        const result = createEmailMessage({
            ...baseArgs,
            htmlBody: "<p>Hello</p>",
            mimeType: "text/html",
        });
        expect(result).toContain("Content-Type: text/html; charset=UTF-8");
        expect(result).toContain("<p>Hello</p>");
    });

    test("creates a multipart/alternative email with both text and HTML", () => {
        const result = createEmailMessage({
            ...baseArgs,
            htmlBody: "<p>Hello HTML</p>",
            mimeType: "multipart/alternative",
        });
        expect(result).toContain("Content-Type: multipart/alternative");
        expect(result).toContain("Content-Type: text/plain; charset=UTF-8");
        expect(result).toContain("Content-Type: text/html; charset=UTF-8");
        expect(result).toContain("Hello, this is a test.");
        expect(result).toContain("<p>Hello HTML</p>");
    });

    test("includes CC and BCC headers when provided", () => {
        const result = createEmailMessage({
            ...baseArgs,
            cc: ["cc@example.com"],
            bcc: ["bcc@example.com"],
        });
        expect(result).toContain("Cc: cc@example.com");
        expect(result).toContain("Bcc: bcc@example.com");
    });

    test("includes In-Reply-To and References headers for replies", () => {
        const result = createEmailMessage({
            ...baseArgs,
            inReplyTo: "<msg-id-123@example.com>",
        });
        expect(result).toContain("In-Reply-To: <msg-id-123@example.com>");
        expect(result).toContain("References: <msg-id-123@example.com>");
    });

    test("encodes non-ASCII subjects with RFC 2047", () => {
        const result = createEmailMessage({
            ...baseArgs,
            subject: "Teste de assunto com acentos",
        });
        // ASCII-only should not be encoded
        expect(result).toContain("Subject: Teste de assunto com acentos");

        const unicodeResult = createEmailMessage({
            ...baseArgs,
            subject: "Tst d'envoi",
        });
        // This has a special char, should still be plain (it's ASCII)
        expect(unicodeResult).toContain("Subject: Tst d'envoi");

        const fullUnicode = createEmailMessage({
            ...baseArgs,
            subject: "Pr\u00fcfung mit Umlauten",
        });
        // u-umlaut is non-ASCII, should be RFC 2047 encoded
        expect(fullUnicode).toContain("Subject: =?UTF-8?B?");
    });

    test("throws on invalid recipient email", () => {
        expect(() =>
            createEmailMessage({
                ...baseArgs,
                to: ["not-valid"],
            }),
        ).toThrow("Recipient email address is invalid");
    });

    test("handles multiple recipients", () => {
        const result = createEmailMessage({
            ...baseArgs,
            to: ["a@b.com", "c@d.com"],
        });
        expect(result).toContain("To: a@b.com, c@d.com");
    });
});
