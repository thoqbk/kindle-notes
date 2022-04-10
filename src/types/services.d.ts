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
    
    position: number; // e.g. 0, 1, 9
    totalFlashcards: number; // e.g. 10
}

export interface NewStudySessionRequest {
    bookId?: string;
    totalFlashcards: number;
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

export interface Sm2Response {
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
}

export interface Db {
    sessions: StudySession[];
    sm2: FlashcardSm2[];
    save: () => Promise<void>;
}

export interface SaveResultRequest {
    sessionId: string;
    flashcardHash: string;
    grade: number; // 0 to 4
}
