import * as path from "path";
import * as fs from "fs/promises";
import * as _ from "lodash";
import config from "../config";
import logger from "../logger";
import * as BookService from "../services/book-service";
import * as FileService from "../services/file-service";
import { Book } from "../types/services";

export const syncBooks = async () => {
    logger.info("Syncing books from Kindle");
    const markdowns = await FileService.allMarkdowns();
    const fileNames = _.fromPairs(markdowns.map(md => [md.id, md.fileName]));
    const books = await BookService.fetchBooks();
    for (const book of books) {
        let filePath = path.join(config.flashcardsHomePath, fileNames[book.id] || toMarkdownFileName(book));
        await fs.writeFile(filePath, BookService.toMarkdown(book), "utf8");
    }
    logger.info("Sync books successfully");
};

const toMarkdownFileName = (book: Book) => {
    return book.name
        .replace(/[^a-zA-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        + ".md";
};
