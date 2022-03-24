import * as assert from "assert";
import * as BookingService from "../../../services/book-service";
import { Book } from "../../../types/services";

const markdow1 = `---
id: 123
name: "test-book"
---
`;

const markdown2 = `---
id: v1234
name: "test title 123"
---

##
line 1
line 2

##

line 3
line 4
<!--
location: "123"
excluded: true
-->
`;

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
        assert.strictEqual(markdown, markdow1);
    });

    test("markdownToBook should parse the markdown content correctly", async () => {
        const book = BookingService.markdownToBook(markdown2);
        assert.strictEqual(book.id, "v1234");
        assert.strictEqual(book.name, "test title 123");
        assert.strictEqual(book.notes.length, 2);
        assert.strictEqual(book.notes[0].content, "line 1\nline 2");
        assert.strictEqual(book.notes[1].content, "line 3\nline 4");
        const note2 = book.notes[1];
        assert.strictEqual(note2.location, "123");
        assert.strictEqual(note2.excluded, true);
    });
});
