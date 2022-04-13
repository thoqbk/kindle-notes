import { Book, Flashcard, PrettierResult } from "../types/services";
import * as Transformers from "../utils/transformers";

const prettier = (markdownContent: string): PrettierResult => {
    try {
        const book = Transformers.markdownToBook(markdownContent);
        const existingHashes = new Set(book.flashcards.map(fc => fc.hash).filter(hash => hash));
        const newBook: Book = {
            ...book,
            flashcards: [],
        };
        for (const flashcard of book.flashcards) {
            if (flashcard.src === "user" && !flashcard.hash && flashcard.content.length) {
                const newFlashcard: Flashcard = {
                    ...flashcard,
                    hash: Transformers.calcHash(flashcard.content, existingHashes),
                };
                newBook.flashcards.push(newFlashcard);
            } else {
                newBook.flashcards.push(flashcard);
            }
            existingHashes.add(newBook.flashcards[newBook.flashcards.length - 1].hash);
        }
        const newMarkdown = Transformers.bookToMarkdown(newBook);
        return {
            markdownContent: newMarkdown,
            status: markdownContent === newMarkdown ? "no-change" : "modified",
        };
    } catch (e) {
        return {
            markdownContent,
            status: "invalid-input"
        };
    }
};

export default prettier;
