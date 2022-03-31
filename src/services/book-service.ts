import * as fs from "fs/promises";
import * as path from "path";
import * as _ from "lodash";
import config from "../config";
import logger from "../logger";
import { Book, Flashcard } from "../types/services";
import * as Transformers from "../utils/transformers";

const fm = require("front-matter");

type Markdown = {
    bookId: string;
    fileName: string;
    content: string;
};

export const allBooks = async (): Promise<Book[]> => {
    const markdowns = await allMarkdowns();
    return markdowns.map(md => Transformers.markdownToBook(md.content));
};

export const getBook = async (bookId: string): Promise<Book | undefined> => {
    const books = await allBooks();
    return books.find(b => b.id === bookId);
};

export const saveBooks = async (books: Book[]): Promise<void> => {
    logger.info(`Saving ${books.length} books to markdown files`);
    const markdowns = await allMarkdowns();
    const fileNames = _.fromPairs(markdowns.map(md => [md.bookId, md.fileName]));
    const existingBooks = _.fromPairs(markdowns.map(md => [md.bookId, Transformers.markdownToBook(md.content)]));
    for (const book of books) {
        const filePath = path.join(config.getFlashcardsHomePath(), fileNames[book.id] || toMarkdownFileName(book));
        const existingBook = existingBooks[book.id];
        if (existingBook) {
            copyUserData(existingBook, book);
        }
        await fs.writeFile(filePath, Transformers.bookToMarkdown(book), "utf8");
    }
    logger.info("Books saved");
};

const allMarkdowns = async (): Promise<Markdown[]> => {
    const retVal: Markdown[] = [];
    logger.info("Getting all markdowns file");
    const fileNames = await fs.readdir(config.getFlashcardsHomePath());
    const markdownFiles = fileNames.filter(fileName => path.extname(fileName) === ".md");
    logger.info(`Found ${markdownFiles.length} markdown files`);
    
    for (const markdownFile of markdownFiles) {
        const data = await fs.readFile(path.join(config.getFlashcardsHomePath(), markdownFile), "utf8");
        const content = fm(data);
        const attributes = content.attributes as any;
        if (content.attributes !== null && content.attributes.id) {
            retVal.push({
                bookId: attributes.id,
                fileName: markdownFile,
                content: data,
            });
        }
    }
    return retVal;
};

/**
 * Copy user-data e.g. backside, excluded
 */
 const copyUserData = (from: Book, to: Book) => {
    const fromFlashcards: {
        [key: string]: Flashcard
    } = _.fromPairs(from.flashcards.map(fc => ([fc.hash, fc])));
    for (const fc of to.flashcards) {
        if (fromFlashcards[fc.hash]) {
            fc.excluded = fromFlashcards[fc.hash].excluded;
            fc.backside = fromFlashcards[fc.hash].backside;
        }
    }
};

const toMarkdownFileName = (book: Book) => {
    return book.name
        .replace(/[^a-zA-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        + ".md";
};
