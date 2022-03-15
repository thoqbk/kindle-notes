import * as path from "path";
import * as fs from "fs/promises";
import config from "../config";
import logger from "../logger";
import * as BookService from "../services/book-service";
import * as FileService from "../services/file-service";
import { Book } from "../types/services";

export const syncBooks = async () => {
    logger.info("Syncing books from Kindle");
    const markdowns = await FileService.allMarkdowns();
    const existingIds = markdowns.map(md => md.id);
    const books = await BookService.fetchBooks();
    for (const book of books) {
        if (existingIds.indexOf(book.id) >= 0) {
            logger.info(`Skipping. Markdown file for ${book.name} is already created`);
            continue;
        } else {
            logger.info(`Creating markdown file for book ${book.name}`);
            const filePath = path.join(config.flashcardsHomePath, toMarkdownFileName(book));
            await fs.writeFile(filePath, frontMatter(book), "utf8");
        }
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

const frontMatter = (book: Book) => {
    return `---
id: ${book.id}
title: "${book.name}"
---
`;
};
