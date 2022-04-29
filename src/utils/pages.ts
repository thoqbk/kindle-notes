import { Note } from "../types/services";

export const extractRawNotePageFn = (elements: Element[], highlightSelector: unknown, noteSelector: unknown, highlightHeaderSelector: unknown): Note[] => {
    return elements.map(element => {
        const highlightElement = element.querySelector(highlightSelector as string);
        const headerElement = element.querySelector(highlightHeaderSelector as string);
        const rawId = highlightElement?.parentElement?.id;
        const highlight = highlightElement?.textContent;
        const highlightHeader = headerElement?.textContent;
        if (!rawId || !highlight || !highlightHeader) {
            return undefined;
        }
        const noteElement = element.querySelector(noteSelector as string);
        const retVal: Note = {
            rawId,
            highlight,
            highlightHeader,
            note: noteElement?.textContent || undefined,
        };
        return retVal;
    }).filter(n => n) as Note[];
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
