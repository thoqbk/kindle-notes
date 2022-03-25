import { Buffer as Transformers } from "buffer";
import * as md5 from "md5";
import { Note, RawNote } from "../types/services";

export const rawNoteToNote = (note: RawNote): Note => {
    const idItems = note?.rawId.split("-");
    const id = (idItems && idItems.length === 2 && idItems[1]) || "";
    const content = note.content?.trim();
    const hash = Transformers.from(md5(id || content), "hex").toString("base64");

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
