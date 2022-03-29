import { Buffer as Transformers } from "buffer";
import * as yaml from "js-yaml";
import * as md5 from "md5";
import { Book, Flashcard, Note, RawNote } from "../types/services";

const defaultNoteId = "";
const defaultHash = "";

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

export const noteToMarkdown = (note: Note): string => {
    let metadata = "";
    if (note.excluded === true) {
        metadata += (metadata && "\n") + "excluded: true";
    }
    if (!!note.location) {
        metadata += (metadata && "\n") + `location: ${note.location}`;
    }
    if (!!note.page) {
        metadata += (metadata && "\n") + `page: ${note.page}`;
    }
    if (!!note.hash) {
        metadata += (metadata && "\n") + `hash: ${note.hash}`;
    }
    if (metadata) {
        metadata = `\n\n<!--\n${metadata}\n-->`;
    }
    let backside = "";
    if (note.backside) {
        backside = `\n\n%%\n\n${note.backside}`;
    }
    return `\n##\n${note.content}${backside}${metadata}\n`;
};

export const mardownToNote = (markdown: string): Note => {
    const withoutMetadata = markdown.replace("##", "").replace(/\<\!\-\-([^]+)\-\-\>/g, "");
    const contentItems = withoutMetadata.split(/\%\%\n+/);
    const retVal: Note = {
        id: defaultNoteId,
        content: contentItems[0].trim(),
        hash: defaultHash,
    };
    if (contentItems.length === 2 && contentItems[1].trim()) {
        retVal.backside = contentItems[1].trim();
    }
    const metadataBlock = markdown.match(/\<\!\-\-([^]+)\-\-\>/);
    if (metadataBlock !== null && metadataBlock.length >= 2) {
        const metadata: any = yaml.load(metadataBlock[1]);
        if (metadata.location) {
            retVal.location = metadata.location;
        }
        if (metadata.excluded) {
            retVal.excluded = metadata.excluded;
        }
        if (metadata.page) {
            retVal.page = metadata.page;
        }
        retVal.hash = metadata.hash || retVal.hash;
        retVal.id = metadata.id || retVal.id;
    }
    return retVal;
};

export const noteToFlashcard = (book: Book, note: Note, position: number): Flashcard => {
    return {
        hash: note.hash,
        bookId: book.id,
        bookName: book.name,
        content: note.content,
        backside: note.backside,
        position,
        page: note.page,
        location: note.location,
    };
};
