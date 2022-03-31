import * as assert from "assert";
import { expect } from "chai";
import * as Transformers from "../../../utils/transformers";
import * as BookService from "../../../services/book-service";
import * as FlashcardService from "../../../services/flashcard-service";

const book1 = Transformers.markdownToBook(`---
id: 123
name: "test book"
---

##
Hello 1

%%
backside line 1

##
Hello 2
##
Hello 3
`);

const book2 = Transformers.markdownToBook(`---
id: 123-2
name: "test book 2"
---

##
Hello 3
`);

const book3 = Transformers.markdownToBook(`---
id: 123
name: "test book"
---

##
Hello 5

##
Hello 6

<!--
excluded: true
-->

`);

suite("FlashcardService Test Suite", () => {
    test("generate should return flaschards from a book", async () => {
        (BookService as any).allBooks = () => ([book1]);
        const flashcards = await FlashcardService.generate();
        assert.strictEqual(flashcards.length, 3);
        assert.strictEqual(flashcards[0].content, "Hello 1");
        assert.strictEqual(flashcards[0].backside, "backside line 1");
        assert.strictEqual(flashcards[0].position, 0);
        assert.strictEqual(flashcards[1].content, "Hello 2");
        assert.strictEqual(flashcards[1].position, 1);
        assert.strictEqual(flashcards[2].content, "Hello 3");
        assert.strictEqual(flashcards[2].position, 2);
    });

    test("generate should return less flashcards from books with less notes", async () => {
        (BookService as any).allBooks = () => ([book1, book2]);
        let bookCounter1 = 0;
        let bookCounter2 = 0;
        let invalid = 0;
        for (let idx = 0; idx < 100; idx++) {
            const flashcards = await FlashcardService.generate();
            if (flashcards[0].bookName === "test book") {
                bookCounter1++;
            } else if (flashcards[0].bookName === "test book 2") {
                bookCounter2++;
            } else {
                invalid++;
            }
        }
        expect(bookCounter2).greaterThan(0);
        expect(bookCounter2).lessThan(bookCounter1);
        expect(invalid).to.be.equal(0);
    });

    test ("generate should ignore excluded flashcard", async () => {
        (BookService as any).allBooks = () => ([book3]);
        const flashcards = await FlashcardService.generate();
        assert.strictEqual(flashcards.length, 1);
        assert.strictEqual(flashcards[0].content, "Hello 5");
    });
});
