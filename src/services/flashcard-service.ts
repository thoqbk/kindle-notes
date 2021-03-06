import * as _ from "lodash";
import { v4 as uuid } from "uuid";
import logger from "../logger";
import { now } from "../utils/times";
import db from "../db";
import sm2 from "../utils/sm2";
import { Book, Flashcard, FlashcardDto, NewStudySessionRequest, SaveResultRequest, StudySession, FlashcardSm2, DbData, StringNumberMap } from "../types/services";
import * as BookService from "./book-service";
import config from "../config";

const msADay = 24 * 60 * 60 * 1000;

export const newStudySession = async (request: NewStudySessionRequest): Promise<StudySession> => {
    const noFlashcard = "There is no card to study for now";
    let book = request.bookId ? await BookService.getBook(request.bookId) : await pickBook();
    if (!book) {
        throw new Error(noFlashcard);
    }
    const totalFlashcards = book.flashcardsPerStudySession || config.getFlashcardsPerStudySession();
    const scheduled = (await pickFlashcards(book, totalFlashcards)).map(fc => fc.hash);
    if (!scheduled.length) {
        throw new Error(noFlashcard);
    }
    const retVal: StudySession = {
        id: uuid(),
        bookId: book.id,
        scheduled,
        needToReview: [],
        totalFlashcards,
        shown: 0,
        status: "on-going",
        startedAt: now(),
    };
    const dbData = await db.load();
    dbData.sessions.push(retVal);
    await db.save(dbData);
    return retVal;
};

export const cancel = async (sessionId: string): Promise<StudySession> => {
    logger.info(`Cancelling session ${sessionId}`);
    const dbData = await db.load();
    const session = dbData.sessions.find(s => s.id === sessionId);
    if (!session) {
        throw new Error(`Session not found ${sessionId}`);
    }
    if (session.status !== "on-going") {
        throw new Error(`Cannot cancel this session ${sessionId}. Invalid session status: ${session.status}`);
    }
    session.status = "cancelled";
    await db.save(dbData);
    logger.info(`Session ${session.id} has been cancelled`);
    return session;
};

export const nextFlashcard = async (sessionId: string): Promise<FlashcardDto> => {
    const dbData = await db.load();
    const session = dbData.sessions.find(s => s.id === sessionId);
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
    await db.save(dbData);
    return await getFlashcardDto(session, hash);
};

export const saveResult = async (request: SaveResultRequest): Promise<void> => {
    const dbData = await db.load();
    const session = dbData.sessions.find(s => s.id === request.sessionId);
    if (!session) {
        throw new Error(`Session not found ${request.sessionId}`);
    }
    if (session.scheduled.indexOf(request.flashcardHash) < 0 && session.needToReview.indexOf(request.flashcardHash) < 0) {
        throw new Error(`Flashcard not found in the session. Session ${session.id}, hash ${request.flashcardHash}`);
    }
    updateSm2(dbData, session, request.flashcardHash, request.grade);
    session.needToReview = session.needToReview.filter(v => v !== request.flashcardHash);
    if (request.grade < 2) {
        session.needToReview.push(request.flashcardHash);
    }
    if (session.shown === session.totalFlashcards) {
        session.status = "completed";
        session.endedAt = now();
    }
    await db.save(dbData);
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

export const getSession = async (id: string): Promise<StudySession | undefined> => {
    const dbData = await db.load();
    return dbData.sessions.find(s => s.id === id);
};

const pickBook = async (): Promise<Book | undefined> => {
    const books = await BookService.allBooks();
    const [validFlashcards, totalFlashcards] = await bookStats(books);
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

const pickFlashcards = async (book: Book, totalFlashcards: number): Promise<Flashcard[]> => {
    const dbData = await db.load();
    const sm2 = _.fromPairs(dbData.sm2.filter(v => v.bookId === book.id).map(v => [v.hash, v]));
    const includedFlashcards = book.flashcards.filter(fc => !fc.excluded);
    let validFlashcards = includedFlashcards.filter(fc => validAge(sm2[fc.hash]));
    if (!validFlashcards.length) { // if not validAge flashcards, try to filter by `excluded` only
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
        lastGrade: (await db.load()).sm2.find(v => v.bookId === session.bookId && v.hash === hash)?.lastGrade,
        src: flashcard.src,
    };
};

const updateSm2 = (dbData: DbData, session: StudySession, hash: string, grade: number) => {
    const defaultSm2: FlashcardSm2 = {
        bookId: session.bookId,
        hash,
        easinessFactor: 2.5,
        repetitionNumber: 0,
        interval: 0,
        lastReview: 0,
        lastGrade: 0,
    };
    const currentSm2 = dbData.sm2.find(v => v.bookId === session.bookId && v.hash === hash) || defaultSm2;
    const result = sm2({
        userGrade: grade,
        repetitionNumber: currentSm2.repetitionNumber,
        easinessFactor: currentSm2.easinessFactor,
        interval: currentSm2.interval
    });
    dbData.sm2 = dbData.sm2.filter(v => v.bookId !== session.bookId || v.hash !== hash);
    dbData.sm2.push({
        ...currentSm2,
        ...result,
        lastGrade: grade,
        lastReview: now(),
    });
};

const flashcardKey = (bookId: string, hash: string) => `${bookId}++${hash}`;

const validAge = (sm2: FlashcardSm2 | undefined) => !sm2 || (now() - sm2.lastReview >= sm2.interval * msADay);

const bookStats = async (books: Book[]): Promise<[StringNumberMap, number]> => {
    const dbData = await db.load();
    const sm2 = _.fromPairs(dbData.sm2.map(v => [flashcardKey(v.bookId, v.hash), v]));
    const validFlashcards: StringNumberMap = {};
    const includedFlashcards: StringNumberMap = {};
    let totalValidFlashcards = 0;
    let totalIncludedFlashcards = 0;
    for (const book of books) {
        const included = book.flashcards.filter(fc => !fc.excluded);
        includedFlashcards[book.id] = included.length;
        totalIncludedFlashcards += included.length;
        
        validFlashcards[book.id] = included.filter(fc => {
            const key = flashcardKey(book.id, fc.hash);
            return validAge(sm2[key]);
        }).length;
        totalValidFlashcards += validFlashcards[book.id];
    }
    return totalValidFlashcards === 0 ? [includedFlashcards, totalIncludedFlashcards] : [validFlashcards, totalValidFlashcards];
};
