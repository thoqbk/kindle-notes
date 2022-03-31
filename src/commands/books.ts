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
