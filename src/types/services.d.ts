/**
* Raw note evaluated inside read.amazon.com
* The object will later be transformed to Note
*/
export interface Note {
    rawId: string;
    highlightHeader: string;
    content: string;
}

export interface Flashcard {
    hash: string; // unique within the book
    content: string;
    src: "kindle" | "user";
    backside?: string;
    excluded?: boolean;
    page?: number;
    location?: number;
}

export interface FlashcardLocation {
    fullFilePath: string;
    line: number; // (1-based value) the first line of the flashcard in the book
}

export interface Book {
    id: string;
    name: string;
    author: string;
    photo: string;
    flashcards: Flashcard[];
    flashcardsPerStudySession?: number;
}

/**
* Sent to UI
*/
export interface FlashcardDto {
    bookId: string;
    bookName: string;
    
    hash: string;
    content: string;
    backside?: string;
    excluded?: boolean;
    page?: number;
    location?: number;
    src: string;
    
    position: number; // e.g. 0, 1, 9
    totalFlashcards: number; // e.g. 10
    lastGrade?: number;
}

export interface NewStudySessionRequest {
    bookId?: string;
}

export interface StudySession {
    id: string;
    bookId: string;

    scheduled: string[]; // hash of scheduled flashcards
    needToReview: string[]; // hash of flashcards with incorrect answer

    // Number of cards will be shown
    // Greater than scheduled.length if not enough valid cards
    totalFlashcards: number;
    shown: number;

    status: "completed" | "on-going" | "cancelled";

    startedAt: number;
    endedAt?: number;
}

export interface Sm2Request {
    userGrade: number;
    repetitionNumber: number;
    easinessFactor: number;
    interval: number;
}

export interface Sm2Result {
    repetitionNumber: number;
    easinessFactor: number;
    interval: number;
}

export interface FlashcardSm2 {
    bookId: string;
    hash: string;
    easinessFactor: number;
    repetitionNumber: number;
    interval: number; // days
    lastReview: number; // ts
    lastGrade: number;
}

export interface DbData {
    sessions: StudySession[];
    sm2: FlashcardSm2[];
}

export interface Db {
    load: () => Promise<DbData>;
    save: (data: DbData) => Promise<void>;
    clearCache: () => void;
}

export interface SaveResultRequest {
    sessionId: string;
    flashcardHash: string;
    grade: number; // 0 to 4
}

export interface PrettierResult {
    markdownContent: string;
    status: "modified" | "no-change" | "invalid-input";
}

export interface StringNumberMap {
    [key: string]: number;
}

export interface StringStringMap {
    [key: string]: string;
}
