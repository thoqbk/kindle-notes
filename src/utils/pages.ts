import { Note } from "../types/services";

export const extractRawNotePageFn = (elements: Element[], noteSelector: unknown, highlightHeaderSelector: unknown): Note[] => {
    return elements.map(element => {
        const noteElement = element.querySelector(noteSelector as string);
        const highlightElement = element.querySelector(highlightHeaderSelector as string);
        if (noteElement === null || highlightElement === null) {
            return null;
        }
        return {
            rawId: noteElement.parentElement?.id,
            content: noteElement.textContent,
            highlightHeader: highlightElement.textContent,
        };
    }).filter((note): note is Note => note !== null);
};
