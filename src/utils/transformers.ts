import { Buffer as Transformers } from "buffer";
import * as yaml from "js-yaml";
import { Book, Flashcard, Note } from "../types/services";
import { now } from "./times";

import md5 = require("md5");
import { replaceAllNoRegex } from "./strings";
import constants from "../constants";
const fm = require("front-matter");

const defaultHash = "";
const defaultId = "";

export const calcHash = (content: string, existingHashes?: Set<string>): string => {
    for (let idx = 0; idx < 10; idx++) {
        const toHash = idx === 0 ? content : `${content}${now()}`;
        const result = Transformers.from(md5(toHash), "hex").toString("base64");
        if (!existingHashes || !existingHashes.has(result)) {
            return result;
        }
    }
    throw new Error(`Cannot generate a unique hash for the content ${content}`);
};

export const noteToFlashcard = (note: Note): Flashcard => {
    const idItems = note?.rawId.split("-");
    const id = (idItems && idItems.length === 2 && idItems[1]) || "";
    const [content, backside] = buildFsBsContent(note.highlight, note.note);
    const hash = calcHash(id || content);

    const pageItems = note.highlightHeader?.split("Page:");
    const locationItems = note.highlightHeader?.split("Location:");

    return {
        content,
        backside,
        hash,
        page: pageItems?.length === 2 ? +(pageItems[1].replace(/\D/g, "")) : undefined,
        location: locationItems?.length === 2 ? +locationItems[1].replace(/\D/g, "") : undefined,
        src: "kindle",
    };
};

export const flashcardToMarkdown = (flashcard: Flashcard): string => {
    let metadata = "";
    if (flashcard.excluded === true) {
        metadata += (metadata && "\n") + "excluded: true";
    }
    if (flashcard.location) {
        metadata += (metadata && "\n") + `location: ${flashcard.location}`;
    }
    if (flashcard.page) {
        metadata += (metadata && "\n") + `page: ${flashcard.page}`;
    }
    if (flashcard.hash) {
        metadata += (metadata && "\n") + `hash: ${flashcard.hash}`;
    }
    if (flashcard.src !== "user") {
        metadata += (metadata && "\n") + `src: ${flashcard.src}`;
    }
    if (metadata) {
        metadata = `\n\n<!--\n${metadata}\n-->`;
    }
    let backside = "";
    if (flashcard.backside) {
        backside = `\n\n${constants.fsBsSplitter}\n\n${flashcard.backside}`;
    }
    return `\n##\n${flashcard.content}${backside}${metadata}\n`;
};

export const mardownToFlashcard = (markdown: string): Flashcard => {
    const withoutMetadata = markdown.replace("##", "").replace(/\<\!\-\-([^]+)\-\-\>/g, "");
    const contentItems = withoutMetadata.split(new RegExp(`${constants.fsBsSplitter}\n+`));
    const retVal: Flashcard = {
        content: contentItems[0].trim(),
        hash: defaultHash,
        src: "user",
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
        retVal.hash = `${metadata.hash}` || retVal.hash;
        retVal.src = metadata.src || retVal.src;
    }
    return retVal;
};

export const bookToMarkdown = (book: Book): string => {
    let retVal = frontMatter(book);
    for (const flashcard of book.flashcards) {
        retVal += flashcardToMarkdown(flashcard);
    }
    return retVal;
};

export const markdownToBook = (markdown: string): Book => {
    const frontMatter = fm(markdown);
    if (!frontMatter?.attributes?.name?.trim().length) {
        throw new Error(`Invalid markdown content ${markdown}`);
    }
    const id = frontMatter.attributes.id ? `${frontMatter.attributes.id}` : defaultId;
    return {
        id,
        name: frontMatter.attributes.name,
        author: frontMatter.attributes.author,
        photo: frontMatter.attributes.photo,
        flashcards: toFlashcards(frontMatter.body),
        flashcardsPerStudySession: toFlashcardsPerStudySession(frontMatter.attributes.flashcardsPerStudySession),
    };
};

const toFlashcards = (markdownBody: string): Flashcard[] => {
    const flashcards = markdownBody.split("##\n");
    return flashcards
        .map(fc => (`##\n${fc}`))
        .map(mardownToFlashcard)
        .filter(fc => !!fc.content);
};

const frontMatter = (book: Book) => {
    let retVal = `---\nid: ${book.id}\nname: "${book.name}"\n`;
    if (book.flashcardsPerStudySession && book.flashcardsPerStudySession > 0) {
        retVal += `flashcardsPerStudySession: ${book.flashcardsPerStudySession}\n`;
    }
    retVal += "---\n";
    return retVal;
};

const toFlashcardsPerStudySession = (value: any): (number | undefined) => {
    const retVal = +value;
    if (!value || !Number.isInteger(retVal) || retVal <= 0) {
        return undefined;
    }
    return retVal;
};

const buildFsBsContent = (highlight: string, note?: string): [string, string?] => {
    let retVal = highlight;
    const cleanedNote = note ? replaceAllNoRegex(replaceAllNoRegex(note, "<br>", "\n"), "<br/>", "\n").trim() : "";
    if (cleanedNote) {
        retVal += `\n\n${cleanedNote}`;
    }
    const fc = mardownToFlashcard(`##\n${retVal}`);
    return [fc.content, fc.backside];
};
