export interface Note {
    id: string;
    content: string;
    excluded?: boolean;
    location?: string;
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
