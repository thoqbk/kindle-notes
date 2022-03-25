import { Note } from "../types/services";

export const extractNotePageFn = (elements: Element[], noteSelector: unknown, highlightHeaderSelector: unknown) => {
    return elements.map(element => {
        const noteElement = element.querySelector(noteSelector as string);
        const highlightElement = element.querySelector(highlightHeaderSelector as string);
        if (noteElement === null || highlightElement === null) {
            return null;
        }
        const idItems = noteElement.parentElement?.id.split("-");
        const id = (idItems && idItems.length === 2 && idItems[1]) || "";

        const pageItems = highlightElement.textContent?.split("Page:");
        const locationItems = highlightElement.textContent?.split("Location:");

        return {
            content: noteElement.textContent || "",
            id,
            page: pageItems?.length === 2 ? +(pageItems[1].replace(/\D/g, "")) : undefined,
            location: locationItems?.length === 2 ? +locationItems[1].replace(/\D/g, "") : undefined
        } as Note;
    }).filter((note): note is Note => note !== null);
};
