import * as assert from "assert";
import { expect } from "chai";
import * as FlashcardService from "../../../services/flashcard-service";

const FileService = require("../../../services/file-service");

const markdown1 = {
    name: "test book",
    fileName: "test-book.md",
    content:`---
id: 123
name: "test book"
---

##
Hello 1

##
Hello 2
`
};

const markdown2 = {
    name: "test book 2",
    fileName: "test-book-2.md",
    content:`---
id: 123-2
name: "test book 2"
---

##
Hello 3
`
};

suite("FlashcardService Test Suite", () => {
    test("generate should return flaschards from a book", async () => {
        FileService.allMarkdowns = () => ([markdown1, markdown2]);
        const flashcards = await FlashcardService.generate();
        assert.strictEqual(flashcards.length, 2);
        assert.strictEqual(flashcards[0].body, "Hello 1");
        assert.strictEqual(flashcards[0].position, 0);
        assert.strictEqual(flashcards[1].body, "Hello 2");
        assert.strictEqual(flashcards[1].position, 1);
    });

    test("generate should return less flashcards from books with less notes", async () => {
        FileService.allMarkdowns = () => ([markdown1, markdown2]);
        let book1 = 0;
        let book2 = 0;
        let invalid = 0;
        for (let idx = 0; idx < 10; idx++) {
            const flashcards = await FlashcardService.generate();
            if (flashcards[0].bookName === "test book") {
                book1++;
            } else if (flashcards[0].bookName === "test book 2") {
                book2++;
            } else {
                invalid++;
            }
        }
        expect(book2).greaterThan(0);
        expect(book2).lessThan(book1);
        expect(invalid).to.be.equal(0);
    });
});