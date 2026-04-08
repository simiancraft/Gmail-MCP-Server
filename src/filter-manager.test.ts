import { describe, expect, test } from "bun:test";
import { formatFilterAction, formatFilterCriteria } from "./filter-manager.js";

describe("formatFilterCriteria", () => {
    test("formats key-value pairs, skipping undefined", () => {
        const result = formatFilterCriteria({
            from: "a@b.com",
            to: undefined,
            subject: "Hi",
        });
        expect(result).toBe("from: a@b.com, subject: Hi");
    });

    test("returns empty string for empty object", () => {
        expect(formatFilterCriteria({})).toBe("");
    });

    test("returns empty string when all values are undefined", () => {
        expect(formatFilterCriteria({ from: undefined, to: undefined })).toBe(
            "",
        );
    });

    test("handles boolean values", () => {
        const result = formatFilterCriteria({ hasAttachment: true });
        expect(result).toBe("hasAttachment: true");
    });

    test("handles numeric values", () => {
        const result = formatFilterCriteria({
            size: 1000000,
            sizeComparison: "larger",
        });
        expect(result).toBe("size: 1000000, sizeComparison: larger");
    });
});

describe("formatFilterAction", () => {
    test("formats arrays as comma-separated values", () => {
        const result = formatFilterAction({
            addLabelIds: ["L1", "L2"],
            removeLabelIds: undefined,
        });
        expect(result).toBe("addLabelIds: L1, L2");
    });

    test("filters out empty arrays", () => {
        const result = formatFilterAction({
            addLabelIds: [],
            forward: "x@y.com",
        });
        expect(result).toBe("forward: x@y.com");
    });

    test("returns empty string for empty object", () => {
        expect(formatFilterAction({})).toBe("");
    });

    test("handles mix of arrays and scalar values", () => {
        const result = formatFilterAction({
            addLabelIds: ["IMPORTANT"],
            forward: "admin@test.com",
        });
        expect(result).toBe("addLabelIds: IMPORTANT, forward: admin@test.com");
    });
});
