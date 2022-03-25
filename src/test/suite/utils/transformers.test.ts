import { expect } from "chai";
import { Note, RawNote } from "../../../types/services";
import * as Transformers from "../../../utils/transformers";

const noteMarkdown = `##

Hello

%%

Backside line 1
Backside line 2

<!--
location: 318
hash: QqUtgYTyU1n6ZHfst7dMkw==
excluded: true
-->

`;

suite("Transformers Util Test Suite", () => {
    test("rawNoteToNote should return note with hash value", () => {
        const rawNote: RawNote = {
            rawId: "highlight-testId",
            content: "hello",
            highlightHeader: "Hello | Location: 123",
        };
        const note = Transformers.rawNoteToNote(rawNote);
        expect(note.hash).not.null;
        expect(note.hash.length).greaterThan(10);
    });

    test("noteToMarkdown should persist hash value", () => {
        const note: Note = {
            id: "test-id",
            hash: "ZGFkc2FkZTEyeA==",
            content: "test-content",
        };
        const result = Transformers.noteToMarkdown(note);
        expect(result.indexOf("hash: ZGFkc2FkZTEyeA==")).greaterThanOrEqual(0);
    });

    test("noteToMarkdown should persist backside", () => {
        const note: Note = {
            id: "test-id-999",
            hash: "ZGFkc2VvvTEyeA==",
            content: "test-content 747",
            backside: "this is backside content"
        };
        const result = Transformers.noteToMarkdown(note);
        expect(result).to.contain("%%\n\nthis is backside content");
    });

    test("markdownToNote should extract metadata fields", () => {
        const result = Transformers.mardownToNote(noteMarkdown);
        expect(result).to.include({
            content: "Hello",
            location: 318,
            hash: "QqUtgYTyU1n6ZHfst7dMkw==",
            excluded: true
        });
    });

    test("markdownToNote should extract backside note", () => {
        const result = Transformers.mardownToNote(noteMarkdown);
        expect(result.backside).equal("Backside line 1\nBackside line 2");
    });
});
