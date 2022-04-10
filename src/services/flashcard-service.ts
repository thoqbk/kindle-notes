import * as _ from "lodash";
import { v4 as uuid } from "uuid";
import logger from "../logger";
import { now } from "../utils/times";
import db from "../db";
import sm2 from "../utils/sm2";
import { Book, Flashcard, FlashcardDto, NewStudySessionRequest, SaveResultRequest, StudySession, FlashcardSm2 } from "../types/services";
import * as BookService from "./book-service";

const msADay = 24 * 60 * 60 * 1000;

export const newStudySession = async (request: NewStudySessionRequest): Promise<StudySession> => {
    let book = request.bookId ? await BookService.getBook(request.bookId) : await pickBook();
    if (!book) {
        throw new Error(`Book not found ${request.bookId}`);
    }
    const scheduled = pickFlashcards(book, request.totalFlashcards).map(fc => fc.hash);
    if (!scheduled.length) {
        throw new Error(`No flashcards available for this book`);
    }
    const retVal: StudySession = {
        id: uuid(),
        bookId: book.id,
        scheduled,
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

export const getStudySession = async (sessionId: string): Promise<StudySession | undefined> => {
    return db.sessions.find(s => s.id === sessionId);
};

export const cancel = async (sessionId: string): Promise<StudySession> => {
    logger.info(`Cancelling session ${sessionId}`);
    const session = await getStudySession(sessionId);
    if (!session) {
        throw new Error(`Session not found ${sessionId}`);
    }
    if (session.status !== "on-going") {
        throw new Error(`Cannot cancel this session ${sessionId}. Invalid session status: ${session.status}`);
    }
    session.status = "cancelled";
    await db.save();
    logger.info(`Session ${session} has been cancelled`);
    return session;
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

export const saveResult = async (request: SaveResultRequest): Promise<void> => {
    const session = db.sessions.find(s => s.id === request.sessionId);
    if (!session) {
        throw new Error(`Session not found ${request.sessionId}`);
    }
    if (session.scheduled.indexOf(request.flashcardHash) < 0 && session.needToReview.indexOf(request.flashcardHash) < 0) {
        throw new Error(`Flashcard not found in the session. Session ${session.id}, hash ${request.flashcardHash}`);
    }
    await updateSm2(session, request.flashcardHash, request.grade);
    session.needToReview = session.needToReview.filter(v => v !== request.flashcardHash);
    if (request.grade < 2) {
        session.needToReview.push(request.flashcardHash);
    }
    if (session.shown === session.totalFlashcards) {
        session.status = "completed";
        session.endedAt = now();
    }
    await db.save();
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

const pickBook = async (): Promise<Book | undefined> => {
    const books = await BookService.allBooks();
    const sm2 = _.fromPairs(db.sm2.map(v => [flashcardKey(v.bookId, v.hash), v]));
    const validFlashcards: {
        [key: string]: number;
    } = {};
    let totalFlashcards = 0;
    for (const book of books) {
        validFlashcards[book.id] = book.flashcards.filter(fc => {
            const key = flashcardKey(book.id, fc.hash);
            return !fc.excluded && validAge(sm2[key]);
        }).length;
        totalFlashcards += validFlashcards[book.id];
    }
    if (totalFlashcards === 0) {
        return undefined;
    }
    const rand = _.random(1, totalFlashcards);
    let prev = 0;
    for (const book of books) {
        const start = prev + 1;
        const end = prev + validFlashcards[book.id];
        if (rand >= start && rand <= end) {
            return book;
        }
        prev = end;
    }
    return undefined;
};

const pickFlashcards = (book: Book, totalFlashcards: number): Flashcard[] => {
    const sm2 = _.fromPairs(db.sm2.filter(v => v.bookId === book.id).map(v => [v.hash, v]));
    const includedFlashcards = book.flashcards.filter(fc => !fc.excluded);
    let validFlashcards = includedFlashcards.filter(fc => validAge(sm2[fc.hash]));
    if (!validFlashcards.length) { // if not validAge flaschards, try to filter by `excluded` only
        validFlashcards = includedFlashcards;
    }
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

const updateSm2 = async (session: StudySession, hash: string, grade: number) => {
    const defaultSm2: FlashcardSm2 = {
        bookId: session.bookId,
        hash,
        easinessFactor: 2.5,
        repetitionNumber: 0,
        interval: 0,
        lastReview: 0
    };
    const currentSm2 = db.sm2.find(v => v.bookId === session.bookId && v.hash === hash) || defaultSm2;
    const result = sm2({
        userGrade: grade,
        repetitionNumber: currentSm2.repetitionNumber,
        easinessFactor: currentSm2.easinessFactor,
        interval: currentSm2.interval
    });
    db.sm2 = db.sm2.filter(v => v.bookId !== session.bookId || v.hash !== hash);
    db.sm2.push({
        ...currentSm2,
        ...result,
        lastReview: now(),
    });
};

const flashcardKey = (bookId: string, hash: string) => `${bookId}++${hash}`;

const validAge = (sm2: FlashcardSm2 | undefined) => !sm2 || (now() - sm2.lastReview >= sm2.interval * msADay);
