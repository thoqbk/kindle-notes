import * as assert from "assert";
import { expect } from "chai";
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
location: 123
page: 98
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
        assert.strictEqual(note2.location, 123);
        assert.strictEqual(note2.page, 98);
        assert.strictEqual(note2.excluded, true);
    });

    test("copyUserData should copy user fields to target", () => {
        const from: Book = {
            id: "133",
            name: "old-name",
            author: "test-author",
            photo: "test-photo",
            notes: [{
                hash: "v-78",
                content: "test-content",
                excluded: true,
                location: 1,
                backside: "this-is-old-backside",
                page: 2,
            }, {
                hash: "v-22",
                content: "test-content-22",
                excluded: true,
                location: 8,
                page: 9,
            }]
        };
        const to: Book = {
            id: "133",
            name: "new-name",
            author: "test-author",
            photo: "test-photo",
            notes: [{
                hash: "v-78",
                content: "test-content-78",
                location: 9,
                page: 10,
            }]
        };
        BookingService.copyUserData(from, to);
        expect(to.notes).has.lengthOf(1);
        expect(to.notes[0]).eql({
            hash: "v-78",
            content: "test-content-78",
            backside: "this-is-old-backside",
            excluded: true,
            location: 9,
            page: 10,
        });
    });
});
