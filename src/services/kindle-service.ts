import * as _ from "lodash";
import * as vscode from "vscode";
import { Page } from "puppeteer";
import logger from "../logger";
import config from "../config";
import * as Pages from "../utils/pages";
import * as Transformers from "../utils/transformers";
import { Book, Note } from "../types/services";
import * as files from "../utils/files";

import puppeteer = require("puppeteer");

files.checkOrCreate(config.dataPath);
files.checkOrCreate(config.browserDataPath);

const notesPageUrl = "https://read.amazon.com/notebook";
const emailSelector = "input[type='email']";
const passwordSelector = "input[type='password']";
const notesContainerSelector = "div#kp-notebook-annotations-pane";
const noteBlocksSelector = "#kp-notebook-annotations .kp-notebook-row-separator";
const noteSelector = "#highlight";
const highlightHeaderSelector = "#annotationHighlightHeader";
const booksSelector = "#kp-notebook-library .kp-notebook-library-each-book";
const bookNameSelector = "a h2";
const authorSelector = "a p";
const bookPhotoSelector = "a div.a-row img";

const spinnerSelector = "#kp-notebook-library-spinner";

/**
 * 
 * @returns true if login successfully
 */
export const login = async (kindleEmail: string, password: string): Promise<boolean> => {
    if (!kindleEmail || !password) {
        return false;
    }
    const browser = await launchBrowser();
    try {
        return await doLogin(browser, kindleEmail, password);
    } finally {
        await browser.close();
    }
};

export const fetchBooks = async (progress?: vscode.Progress<{ message: string }>): Promise<Book[]> => {
    const browser = await launchBrowser();
    try {
        return await doFetchBooks(browser, progress);
    } finally {
        await browser.close();
    }
};

const doFetchBooks = async (browser: puppeteer.Browser, progress?: vscode.Progress<{ message: string }>): Promise<Book[]> => {
    progress?.report({ message: "fetching book list" });
    const notesPage = await ensureNotesPage(browser);
    // getting books
    const books: Book[] = await notesPage.$$eval(
        booksSelector,
        (elements: Element[], authorSelector: any, bookNameSelector: any, bookPhotoSelector: any) =>
            elements.map(element => {
                const authorText = element.querySelector(authorSelector)?.textContent || "";
                const byText = "By: ";
                const author = authorText.indexOf(byText) === 0 ? authorText.substring(byText.length) : authorText;
                return {
                    id: element.id,
                    name: element.querySelector(bookNameSelector)?.textContent || "",
                    author,
                    photo: element.querySelector(bookPhotoSelector)?.getAttribute("src") || "",
                    flashcards: [],
                };
            }),
        authorSelector,
        bookNameSelector,
        bookPhotoSelector
    );
    logger.info(`Found ${books.length} books`);
    for (let idx = 0; idx < books.length; idx++) {
        const book = books[idx];
        logger.info(`Fetching notes for book ${book.name}`);
        progress?.report({ message: `(${idx + 1} of ${books.length}) book "${book.name}"` });
        const notes = await fetchNotes(book.id, browser);
        book.flashcards = notes.map(Transformers.noteToFlashcard);
    }
    logger.info(`Finish fetching books, found ${books.length}. Closing browser`);
    await browser.close();
    logger.info("Browser closed");
    return books;
};

const fetchNotes = async (bookId: string, browser: puppeteer.Browser): Promise<Note[]> => {
    logger.info(`Fetching notes for book ${bookId}`);
    const notesPage = await ensureNotesPage(browser);
    const bookLinkSelector = getBookLinkSelector(bookId);
    if (!(await foundElement(notesPage, bookLinkSelector))) {
        logger.info(`Book not found ${bookId}, returning empty notes`);
        return [];
    }
    await waitForVisibleAndClick(notesPage, bookLinkSelector);
    await notesPage.waitForFunction(Pages.receivedAllNotesPageFn);

    // getting notes
    const retVal = await notesPage.$$eval(
        noteBlocksSelector,
        Pages.extractRawNotePageFn,
        noteSelector, highlightHeaderSelector
    );
    logger.info(`Found ${retVal.length} raw-notes for book ${bookId}`);
    return retVal;
};

const doLogin = async (browser: puppeteer.Browser, kindleEmail: string, password: string): Promise<boolean> => {
    const [page] = await browser.pages();
    await page.goto(notesPageUrl);
    await page.waitForNetworkIdle();
    if (!(await isLoginPage(page))) {
        return true;
    }
    if (await foundElement(page, emailSelector)) {
        await page.focus(emailSelector);
        await page.keyboard.type(kindleEmail);
    }
    await page.focus(passwordSelector);
    await page.keyboard.type(password);
    await page.keyboard.press("Enter");
    await page.waitForNavigation();
    return !(await isLoginPage(page));
};

const ensureNotesPage = async (browser: puppeteer.Browser): Promise<Page> => {
    const [retVal] = await browser.pages();
    if (await isNotesPage(retVal)) {
        return retVal;
    }
    for (let retries = 1; retries < 3; retries++) {
        logger.info(`Loading notesPage. Retries = ${retries}`);
        await retVal.goto(notesPageUrl);
        await retVal.waitForNetworkIdle();
        if (await isNotesPage(retVal)) {
            return retVal;
        }
    }
    throw new Error("Cannot load the notesPage");
};

const launchBrowser = async (): Promise<puppeteer.Browser> => {
    return puppeteer.launch({
        headless: config.isHeadless(),
        userDataDir: config.browserDataPath,
    });
};

const isLoginPage = async (page: Page): Promise<boolean> => {
    return await foundElement(page, emailSelector) || await foundElement(page, passwordSelector);
};

const isNotesPage = async (page: Page): Promise<boolean> => {
    return await foundElement(page, notesContainerSelector)
        && !(await page.$$eval(spinnerSelector, Pages.isVisiblePageFn));
};

const foundElement = async (page: Page | undefined, selector: string): Promise<boolean> => {
    const retVal = page && await page.$(selector);
    logger.info(`Finding element "${selector}" in page. Found: ${!!retVal}`);
    return !!retVal;
};

const getBookLinkSelector = (id: string): string => `div#kp-notebook-library div#${id} a`;

const waitForVisibleAndClick = async (page: Page, selector: string) => {
    await page.waitForSelector(selector, { visible: true });
    await page.click(selector);
};
