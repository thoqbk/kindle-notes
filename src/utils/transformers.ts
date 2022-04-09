import { Buffer as Transformers } from "buffer";
import * as yaml from "js-yaml";
import * as md5 from "md5";
import { Book, Flashcard, Note } from "../types/services";

const fm = require("front-matter");

const defaultHash = "";

export const noteToFlashcard = (note: Note): Flashcard => {
    const idItems = note?.rawId.split("-");
    const id = (idItems && idItems.length === 2 && idItems[1]) || "";
    const content = note.content?.trim();
    const hash = Transformers.from(md5(id || content), "hex").toString("base64");

    const pageItems = note.highlightHeader?.split("Page:");
    const locationItems = note.highlightHeader?.split("Location:");

    return {
        content,
        hash,
        page: pageItems?.length === 2 ? +(pageItems[1].replace(/\D/g, "")) : undefined,
        location: locationItems?.length === 2 ? +locationItems[1].replace(/\D/g, "") : undefined
    };
};

export const flashcardToMarkdown = (flashcard: Flashcard): string => {
    let metadata = "";
    if (flashcard.excluded === true) {
        metadata += (metadata && "\n") + "excluded: true";
    }
    if (!!flashcard.location) {
        metadata += (metadata && "\n") + `location: ${flashcard.location}`;
    }
    if (!!flashcard.page) {
        metadata += (metadata && "\n") + `page: ${flashcard.page}`;
    }
    if (!!flashcard.hash) {
        metadata += (metadata && "\n") + `hash: ${flashcard.hash}`;
    }
    if (metadata) {
        metadata = `\n\n<!--\n${metadata}\n-->`;
    }
    let backside = "";
    if (flashcard.backside) {
        backside = `\n\n%%\n\n${flashcard.backside}`;
    }
    return `\n##\n${flashcard.content}${backside}${metadata}\n`;
};

export const mardownToFlashcard = (markdown: string): Flashcard => {
    const withoutMetadata = markdown.replace("##", "").replace(/\<\!\-\-([^]+)\-\-\>/g, "");
    const contentItems = withoutMetadata.split(/\%\%\n+/);
    const retVal: Flashcard = {
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
    if (frontMatter.attributes === null) {
        throw new Error(`Invalid markdown content ${markdown}`);
    }
    return {
        id: `${frontMatter.attributes.id}`,
        name: frontMatter.attributes.name,
        author: frontMatter.attributes.author,
        photo: frontMatter.attributes.photo,
        flashcards: toFlashcards(frontMatter.body),
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
    return `---
id: ${book.id}
name: "${book.name}"
---
`;
};
