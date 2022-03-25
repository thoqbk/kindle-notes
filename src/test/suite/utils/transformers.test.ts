import { expect } from "chai";
import { Note, RawNote } from "../../../types/services";
import * as Transformers from "../../../utils/transformers";

const noteMarkdown = `##

Hello
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

    test("markdownToNote should extract metadata fields", () => {
        const result = Transformers.mardownToNote(noteMarkdown);
        expect(result).eql({
            content: "Hello",
            location: 318,
            id: "",
            hash: "QqUtgYTyU1n6ZHfst7dMkw==",
            excluded: true
        });
    });
});
