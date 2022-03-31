export interface FlashcardDto {
    bookId: string;
    bookName?: string;

    hash: string;
    content: string;
    backside?: string;
    excluded?: boolean;
    page?: number;
    location?: number;

    position: number; // e.g. 1 of 10
    totalFlashcards: number;
}

export interface FlashcardPayload {
    flashcard: FlashcardDto;
}