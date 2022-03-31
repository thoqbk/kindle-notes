import * as _ from "lodash";
import logger from "../logger";
import * as KindleService from "../services/kindle-service";
import * as BookService from "../services/book-service";

export const syncBooks = async () => {
    logger.info("Syncing books from Kindle");
    const books = await KindleService.fetchBooks();
    await BookService.saveBooks(books);
    logger.info("Sync books successfully");
};

/**
 * The way we generate file name for the markdown can be changed
 * (i.e. change in Files.determineFileName)
 * If so, we may want to run this function to change file names to the new values
 */
export const resetToDefaultFileNames = async () => {
    const books = await BookService.allBooks();
    for (const book of books) {
        await BookService.deleteBook(book.id);
        await BookService.saveBooks([book]);
    }
};
