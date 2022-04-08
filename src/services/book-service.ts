import * as fs from "fs/promises";
import * as path from "path";
import * as _ from "lodash";
import config from "../config";
import logger from "../logger";
import { Book, Flashcard, FlashcardLocation } from "../types/services";
import * as Transformers from "../utils/transformers";
import * as Files from "../utils/files";

const fm = require("front-matter");

let cachedMarkdowFilePaths: { // bookId -> fullFilePath
    [key: string]: string
} = {};

type Markdown = {
    bookId: string;
    fullFilePath: string;
    content: string;
};

export const allBooks = async (): Promise<Book[]> => {
    const markdowns = await allMarkdowns();
    return markdowns.map(md => Transformers.markdownToBook(md.content));
};

export const getBook = async (bookId: string): Promise<Book | undefined> => {
    const data = await readBookData(bookId);
    return data ? Transformers.markdownToBook(data) : undefined;
};

export const saveBooks = async (books: Book[]): Promise<void> => {
    logger.info(`Saving ${books.length} books to markdown files`);
    const markdowns = await allMarkdowns();
    const allFilePaths = markdowns.map(md => md.fullFilePath);
    const filePathByBookIds = _.fromPairs(markdowns.map(md => [md.bookId, md.fullFilePath]));
    const existingBooks = _.fromPairs(markdowns.map(md => [md.bookId, Transformers.markdownToBook(md.content)]));
    for (const book of books) {
        const defaultFileName = suffixFileName(Files.determineFileName(book.name), allFilePaths);
        const filePath = filePathByBookIds[book.id] || path.join(config.getFlashcardsHomePath(), defaultFileName);
        const existingBook = existingBooks[book.id];
        if (existingBook) {
            copyUserData(existingBook, book);
        }
        await fs.writeFile(filePath, Transformers.bookToMarkdown(book), "utf8");
    }
    logger.info("Books saved");
};

/**
 * Delete markdown file for this book
 * @param bookId
 * @returns true if found the book and delete the markdown file successfully
 */
export const deleteBook = async (bookId: string): Promise<boolean> => {
    logger.info(`Deleting book ${bookId}`);
    const filePath = await getFullFilePath(bookId);
    if (!filePath) {
        return false;
    }
    logger.info(`Deleting file ${filePath}`);
    await fs.unlink(filePath);
    logger.info(`File deleted`);
    return true;
};

export const getFlashcardLocation = async (bookId: string, flashcardHash: string): Promise<FlashcardLocation | undefined> => {
    const fullFilePath = await getFullFilePath(bookId);
    const data = await readBookData(bookId);
    if (!fullFilePath || !data) {
        return undefined;
    }
    const lines = data.split("\n").map(line => line.trim());
    let lastBeginFlashcardLine: number = -1;
    for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx];
        if (line.indexOf("##") === 0 && line.indexOf("###") === -1) {
            lastBeginFlashcardLine = idx + 1;
        } else if (line.indexOf("hash") >= 0 && line.indexOf(flashcardHash) >= 0) {
            return {
                fullFilePath,
                line: lastBeginFlashcardLine
            };
        }
    }
};

const allMarkdowns = async (): Promise<Markdown[]> => {
    const retVal: Markdown[] = [];
    logger.info("Getting all markdowns file");
    const fileNames = await fs.readdir(config.getFlashcardsHomePath());
    const markdownFiles = fileNames.filter(fileName => path.extname(fileName) === ".md");
    logger.info(`Found ${markdownFiles.length} markdown files`);

    for (const markdownFile of markdownFiles) {
        const fullFilePath = path.join(config.getFlashcardsHomePath(), markdownFile);
        const data = await fs.readFile(fullFilePath, "utf8");
        const content = fm(data);
        const attributes = content.attributes as any;
        if (content.attributes !== null && content.attributes.id) {
            retVal.push({
                bookId: attributes.id,
                fullFilePath,
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
            fc.backside = fromFlashcards[fc.hash].backside?.trim();
            // Keep the old content if it is modified but not empty
            fc.content = fromFlashcards[fc.hash].content.trim() || fc.content;
        }
    }
};

const suffixFileName = (originalFileName: string, allFilePaths: string[]): string => {
    let retVal = originalFileName;
    for (let suffix = 2; suffix < 10; suffix++) {
        const filePath = path.join(config.getFlashcardsHomePath(), retVal);
        if (allFilePaths.indexOf(filePath) >= 0) {
            retVal = `${path.parse(originalFileName).name}-${suffix}.md`;
        } else {
            return retVal;
        }
    }
    throw new Error(`Cannot find a unique name for the originalFileName ${originalFileName}`);
};

const readBookData = async (bookId: string): Promise<string | undefined> => {
    const filePath = await getFullFilePath(bookId);
    return filePath && (await fs.readFile(filePath, "utf8"));
};

const getFullFilePath = async (bookId: string): Promise<string | undefined> => {
    const cached = cachedMarkdowFilePaths[bookId];
    if (cached && Files.exists(cached)) {
        return cached;
    }
    const markdowns = await allMarkdowns();
    cachedMarkdowFilePaths = _.fromPairs(markdowns.map(md => ([md.bookId, md.fullFilePath])));
    return cachedMarkdowFilePaths[bookId];
};
