import * as assert from "assert";
import * as BookingService from "../../../services/book-service";
import { Book } from "../../../types/services";

suite("BookService Test Suite", () => {
    test("toMarkdown should return correct frontmatter section", async () => {
        const book: Book = {
            id: "123",
            name: "test-book",
            author: "test-author",
            photo: "test-photo",
            notes: [],
        };
        const markdown = BookingService.toMarkdown(book);
        assert.strictEqual(markdown, `---
id: 123
name: "test-book"
---
`);
    });
    test("markdownToBook should parse the markdown content correctly", async () => {
        const markdown = `---
id: v1234
name: "test title 123"
---

##
line 1
line 2

##

line 3
line 4

`;
        const book = BookingService.markdownToBook(markdown);
        assert.strictEqual(book.id, "v1234");
        assert.strictEqual(book.name, "test title 123");
        assert.strictEqual(book.notes.length, 2);
        assert.strictEqual(book.notes[0].content, `line 1
line 2`);
        assert.strictEqual(book.notes[1].content, `line 3
line 4`);
    });
});