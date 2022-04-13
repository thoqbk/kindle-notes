import * as vscode from "vscode";
import * as path from "path";
import { Book, Flashcard, PrettierResult } from "../types/services";
import * as Transformers from "../utils/transformers";
import { now } from "./times";
import config from "../config";

const prettier = (markdownContent: string): PrettierResult => {
    try {
        const book = Transformers.markdownToBook(markdownContent);
        const existingHashes = new Set(book.flashcards.map(fc => fc.hash).filter(hash => hash));
        const newBook: Book = {
            ...book,
            id: book.id || Transformers.calcHash(`${book.name}${now()}`),
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

export const shouldHandleOnWillSaveTextDocument = (event: vscode.TextDocumentWillSaveEvent): boolean => {
    const parsed = path.parse(event.document.uri.fsPath);
    const flashcardHomePath = config.getFlashcardsHomePath();
    return event.reason === vscode.TextDocumentSaveReason.Manual
        && flashcardHomePath
        && parsed.ext === ".md"
        && parsed.dir.indexOf(flashcardHomePath) === 0;
};

export default prettier;
