import { expect } from "chai";
import { Book, Flashcard, Note } from "../../../types/services";
import * as Transformers from "../../../utils/transformers";

const markdow1 = `---
id: 123
name: "test-book"
---
`;

const markdown2 = `---
id: v1234
name: "test title 123"
flashcardsPerStudySession: 6
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
    test("toMarkdown should return correct frontmatter section", () => {
        const book: Book = {
            id: "123",
            name: "test-book",
            author: "test-author",
            photo: "test-photo",
            flashcards: [],
        };
        const result = Transformers.bookToMarkdown(book);
        expect(result).to.equal(markdow1);
    });

    test("toMarkdown should persist flashcardsPerStudySession if exists", () => {
        const book: Book = {
            id: "123",
            name: "test-book",
            author: "test-author",
            photo: "test-photo",
            flashcards: [],
            flashcardsPerStudySession: 8,
        };
        expect(Transformers.bookToMarkdown(book)).contains("flashcardsPerStudySession: 8");
    });

    test("noteToFlashcard should return note with hash value", () => {
        const rawNote: Note = {
            rawId: "highlight-testId",
            highlight: "hello",
            highlightHeader: "Hello | Location: 123",
        };
        const fc = Transformers.noteToFlashcard(rawNote);
        expect(fc.hash).not.null;
        expect(fc.content).eq("hello");
        expect(fc.hash.length).greaterThan(10);
    });

    test("noteToFlashcard should combine note to flashcard content", () => {
        const note: Note = {
            rawId: "highlight-testId",
            highlightHeader: "Hello | Location: 123",
            highlight: "this is highlight",
            note: "this is note<br>line 1<br/>line 2<br>"
        };
        const fc = Transformers.noteToFlashcard(note);
        expect(fc.content).eq("this is highlight\nthis is note\nline 1\nline 2");
    });

    test("flashcardToMarkdown should persist hash value", () => {
        const flashcard: Flashcard = {
            hash: "ZGFkc2FkZTEyeA==",
            content: "test-content",
            src: "user"
        };
        const result = Transformers.flashcardToMarkdown(flashcard);
        expect(result.indexOf("hash: ZGFkc2FkZTEyeA==")).greaterThanOrEqual(0);
    });

    test("flashcardToMarkdown should persist src if it's non `user`", () => {
        const flashcard: Flashcard = {
            hash: "123",
            content: "test-content",
            src: "kindle",
        };
        const result = Transformers.flashcardToMarkdown(flashcard);
        expect(result.indexOf("src: kindle")).greaterThanOrEqual(0);
    });

    test("flashcardToMarkdown should NOT persist `user` src", () => {
        const flashcard: Flashcard = {
            hash: "123",
            content: "test-content",
            src: "user",
        };
        const result = Transformers.flashcardToMarkdown(flashcard);
        expect(result.indexOf("user")).to.not.greaterThanOrEqual(0);
    });

    test("flashcardToMarkdown should persist backside", () => {
        const flashcard: Flashcard = {
            hash: "ZGFkc2VvvTEyeA==",
            content: "test-content 747",
            backside: "this is backside content",
            src: "kindle",
        };
        const result = Transformers.flashcardToMarkdown(flashcard);
        expect(result).to.contain("%%\n\nthis is backside content");
    });

    test("markdownToNote should extract metadata fields", () => {
        const result = Transformers.mardownToFlashcard(noteMarkdown);
        expect(result).to.include({
            content: "Hello",
            location: 318,
            hash: "QqUtgYTyU1n6ZHfst7dMkw==",
            excluded: true
        });
    });

    test("markdownToNote should extract backside note", () => {
        const result = Transformers.mardownToFlashcard(noteMarkdown);
        expect(result.backside).equal("Backside line 1\nBackside line 2");
    });

    test("markdownToBook should parse the markdown content correctly", async () => {
        const book = Transformers.markdownToBook(markdown2);

        expect(book).to.contain({
            id: "v1234",
            name: "test title 123",
            flashcardsPerStudySession: 6,
        });
        expect(book.flashcards).to.have.lengthOf(2);
        expect(book.flashcards[0]).to.contain({
            content: "line 1\nline 2",
        });
        expect(book.flashcards[1]).to.contain({
            content: "line 3\nline 4",
            location: 123,
            page: 98,
            excluded: true
        });
    });
});
