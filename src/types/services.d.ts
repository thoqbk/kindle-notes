export interface Note {
    id?: string;
    hash: string;
    content: string;
    backside?: string;
    excluded?: boolean;
    location?: number;
    page?: number;
}

/**
 * Raw note evaluated inside read.amazon.com
 * The object will later be transformed to Note
 */
export interface RawNote {
    rawId: string;
    highlightHeader: string;
    content: string;
}

export interface Book {
    id: string;
    name: string;
    author: string;
    photo: string;
    notes: Note[];
}

export interface Markdown {
    id?: string;
    name: string;
    fileName: string;
    content: string;
}

export interface Flashcard {
    bookName?: string;
    body: string;
    position: number; // e.g. 1 of 10
}
