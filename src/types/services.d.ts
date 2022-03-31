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
