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
        needToReview: [],
        totalFlashcards: request.totalFlashcards,
        shown: 0,
        status: "on-going",
        startedAt: now(),
    };
    db.sessions.push(retVal);
    await db.save();
    return retVal;
};

export const nextFlashcard = async (sessionId: string): Promise<FlashcardDto> => {
    const session = db.sessions.find(s => s.id === sessionId);
    if (!session) {
        throw new Error(`Session ${sessionId} not found`);
    }
    if (session.status !== "on-going") {
        throw new Error(`nextFlashcard fails due to invalid session status: ${session.status}`);
    }
    if (session.shown >= session.totalFlashcards) {
        throw new Error(`All flashcards have been shown`);
    }
    const remaining = session.totalFlashcards - session.shown;
    const fromNeedToReviews = session.needToReview.length
        && (
            session.needToReview.length >= remaining
            || session.shown >= session.scheduled.length
        );
    let hash: string | undefined = "";
    if (fromNeedToReviews) {
        hash = _.sample(session.needToReview);
    } else if (session.shown < session.scheduled.length) {
        hash = session.scheduled[session.shown];
    } else {
        hash = _.sample(session.scheduled);
    }
    if (!hash) {
        throw new Error(`Cannot pick flashcard for session ${sessionId}`);
    }
    session.shown++;
    await db.save();
    return await getFlashcardDto(session, hash);
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

const getFlashcardDto = async (session: StudySession, hash: string): Promise<FlashcardDto> => {
    const book = await BookService.getBook(session.bookId);
    const flashcard = book?.flashcards.find(fc => fc.hash === hash);
    if (!book || !flashcard) {
        throw new Error(`Flashcard not found. BookId ${session.bookId}, hash ${hash}`);
    }
    return {
        bookId: book.id,
        bookName: book.name,
        hash,
        content: flashcard.content,
        backside: flashcard.backside,
        excluded: flashcard.excluded,
        page: flashcard.page,
        location: flashcard.location,
        position: session.shown - 1,
        totalFlashcards: session.totalFlashcards,
    };
};

const filterValidFlashcard = (flashcard: Flashcard): boolean => !flashcard.excluded;
