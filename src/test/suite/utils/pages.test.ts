import { expect } from "chai";
import { RawNote } from "../../../types/services";
import * as Pages from "../../../utils/pages";

suite("Pages Util Test Suite", () => {
    test("rawNoteToNote should return note with hash value", () => {
        const rawNote: RawNote = {
            rawId: "highlight-testId",
            content: "hello",
            highlightHeader: "Hello | Location: 123",
        };
        const note = Pages.rawNoteToNote(rawNote);
        expect(note.hash).not.null;
        expect(note.hash.length).greaterThan(10);
    });
});
