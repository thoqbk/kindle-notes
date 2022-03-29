import * as _ from "lodash";
import { Book, Flashcard, Note } from "../types/services";
import * as FileService from "../services/file-service";
import * as BookService from "../services/book-service";
import * as Transformers from "../utils/transformers";

const numberOfFlashcards = 10;

export const generate = async (bookId?: string): Promise<Flashcard[]> => {
    const books = await loadBooksFromMarkdownFiles();
    const book = bookId ? books.find(b => b.id === bookId) : pickBook(books);
    if (!book) {
        return [];
    }
    const notes = pickNotes(book);
    return notes.map((n, idx) => Transformers.noteToFlashcard(book, n, idx));
};

const loadBooksFromMarkdownFiles = async (): Promise<Book[]> => {
    const markdowns = await FileService.allMarkdowns();
    return markdowns.map(markdown => BookService.markdownToBook(markdown.content));
};

const pickBook = (books: Book[]): Book | null => {
    const totalNotes = _.sumBy(books, book => book.notes.filter(filterValidNote).length);
    if (totalNotes === 0) {
        return null;
    }
    const rand = _.random(1, totalNotes);
    let prev = 0;
    for (const book of books) {
        const start = prev + 1;
        const end = prev + book.notes.filter(filterValidNote).length;
        if (rand >= start && rand <= end) {
            return book;
        }
        prev = end;
    }
    return null;
};

const pickNotes = (book: Book): Note[] => {
    const validNotes = book.notes.filter(filterValidNote);
    if (validNotes.length <= numberOfFlashcards) {
        return validNotes;
    }
    const items = validNotes.map((n, idx) => ({
        idx,
        note: n
    }));
    const randomItems = _.shuffle(items).slice(0, numberOfFlashcards);
    return _.sortBy(randomItems, item => item.idx).map(item => item.note);
};

const filterValidNote = (note: Note): boolean => !note.excluded;