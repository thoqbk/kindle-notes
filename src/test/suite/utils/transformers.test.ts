import { expect } from "chai";
import { RawNote } from "../../../types/services";
import * as Transformers from "../../../utils/transformers";

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
});
