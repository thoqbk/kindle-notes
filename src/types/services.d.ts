export interface Note {
    id: string;
    content: string;
}

export interface Book {
    id: string;
    name: string;
    author: string;
    photo: string;
}

export interface Markdown {
    id?: string;
    title: string;
    fileName: string;
}
