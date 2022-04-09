import * as _ from "lodash";
import { v4 as uuid } from "uuid";
import logger from "../logger";
import { now } from "../utils/times";
import db from "../db";
import { Book, Flashcard, FlashcardDto, NewStudySessionRequest, StudySession } from "../types/services";
import * as BookService from "./book-service";

const numberOfFlashcards = 10;
const msADay = 24 * 60 * 60 * 1000;

export const newStudySession = async (request: NewStudySessionRequest): Promise<StudySession> => {
    const book = await BookService.getBook(request.bookId);
    if (!book) {
        throw new Error(`Book not found ${request.bookId}`);
    }

    const retVal: StudySession = {
        id: uuid(),
        bookId: request.bookId,
        scheduled: pickFlashcards(book, request.totalFlashcards).map(fc => fc.hash),
        needToReviews: [],
        totalFlashcards: request.totalFlashcards,
        showed: 0,
        status: "on-going",
        startedAt: now(),
    };
    db.sessions.push(retVal);
    await db.save();

    return retVal;
};

export const generate = async (bookId?: string): Promise<FlashcardDto[]> => {
    const books = await BookService.allBooks();
    const book = bookId ? books.find(b => b.id === bookId) : pickBook(books);
    if (!book) {
        return [];
    }
    const flashcards = pickFlashcards(book, numberOfFlashcards);
    return flashcards.map((fc, position) => ({
        bookId: book.id,
        bookName: book.name,
        ...fc,
        position,
        totalFlashcards: flashcards.length,
    }));
};

export const refreshCards = async (refreshingFlashcards: FlashcardDto[]): Promise<FlashcardDto[]> => {
    if (!refreshingFlashcards.length) {
        return [];
    }
    const bookId = refreshingFlashcards[0].bookId;
    const book = await BookService.getBook(bookId);
    if (!book) {
        logger.info(`Cannot refresh card, book not found ${bookId}`);
        return refreshingFlashcards;
    }
    const flashcards: {
        [key: string]: Flashcard
    } = _.fromPairs(book.flashcards.map(n => ([n.hash, n])));
    const retVal: FlashcardDto[] = [];
    for (const refreshing of refreshingFlashcards) {
        const existing = flashcards[refreshing.hash];
        if (!existing) {
            retVal.push(refreshing);
        } else {
            retVal.push({
                ...refreshing,
                ...existing,
            });
        }
    }
    return retVal;
};

const pickBook = (books: Book[]): Book | null => {
    const totalNotes = _.sumBy(books, book => book.flashcards.filter(filterValidFlashcard).length);
    if (totalNotes === 0) {
        return null;
    }
    const rand = _.random(1, totalNotes);
    let prev = 0;
    for (const book of books) {
        const start = prev + 1;
        const end = prev + book.flashcards.filter(filterValidFlashcard).length;
        if (rand >= start && rand <= end) {
            return book;
        }
        prev = end;
    }
    return null;
};

const pickFlashcards = (book: Book, totalFlashcards: number): Flashcard[] => {
    const sm2 = _.fromPairs(db.sm2.filter(v => v.bookId === book.id).map(v => [v.hash, v]));
    const validFlashcards = book.flashcards.filter(fc => {
        const validAge = !sm2[fc.hash]
            || (now() - sm2[fc.hash].lastReview >= sm2[fc.hash].interval * msADay);
        return !fc.excluded && validAge;
    });
    if (validFlashcards.length <= totalFlashcards) {
        return validFlashcards;
    }
    const items = validFlashcards.map((n, idx) => ({
        idx,
        note: n
    }));
    const randomItems = _.shuffle(items).slice(0, totalFlashcards);
    return _.sortBy(randomItems, item => item.idx).map(item => item.note);
};

const filterValidFlashcard = (flashcard: Flashcard): boolean => !flashcard.excluded;
