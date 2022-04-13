export interface FlashcardDto {
    bookId: string;
    bookName?: string;

    hash: string;
    content: string;
    backside?: string;
    excluded?: boolean;
    page?: number;
    location?: number;
    src: string;

    position: number; // e.g. 1 of 10
    totalFlashcards: number;

    lastGrade?: number; // 0 to 4
}

export interface FlashcardPayload {
    flashcard: FlashcardDto;
}
