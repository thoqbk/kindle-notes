import { Buffer } from "buffer";
import * as md5 from "md5";
import { Note, RawNote } from "../types/services";

export const extractRawNotePageFn = (elements: Element[], noteSelector: unknown, highlightHeaderSelector: unknown): RawNote[] => {
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
    }).filter((note): note is RawNote => note !== null);
};

export const rawNoteToNote = (note: RawNote): Note => {
    const idItems = note?.rawId.split("-");
    const id = (idItems && idItems.length === 2 && idItems[1]) || "";
    const content = note.content?.trim();
    const hash = Buffer.from(md5(id || content), "hex").toString("base64");

    const pageItems = note.highlightHeader?.split("Page:");
    const locationItems = note.highlightHeader?.split("Location:");

    return {
        id,
        content,
        hash,
        page: pageItems?.length === 2 ? +(pageItems[1].replace(/\D/g, "")) : undefined,
        location: locationItems?.length === 2 ? +locationItems[1].replace(/\D/g, "") : undefined
    };
};
