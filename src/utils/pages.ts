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

/**
 * Check and extract the highlights counter to tell if the page is loaded successfully or not.
 * If not, the text will be `--`
 */
export const receivedAllNotesPageFn = (): boolean => {
    const notesCount = document.querySelector("#kp-notebook-highlights-count");
    return !isNaN(parseInt(notesCount?.textContent || ""));
};

export const isVisiblePageFn = (elements: Element[]): boolean => {
    return !!elements.length && window.getComputedStyle(elements[0]).display !== 'none';
};
