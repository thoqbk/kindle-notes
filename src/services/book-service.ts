import * as _ from "lodash";
import { Page } from "puppeteer";
import * as puppeteer from "puppeteer";
import logger from "../logger";
import config from "../config";
import * as Pages from "../utils/pages";
import * as Transformers from "../utils/transformers";
import { Book, Note } from "../types/services";
import * as FileService from "../services/file-service";

const fm = require("front-matter");

const notesPageUrl = "https://read.amazon.com/notebook";
const emailSelector = "input[type='email']";
const passwordSelector = "input[type='password']";
const notesContainerSelector = "div#kp-notebook-annotations-pane";
const bookMetadataSelector = "div#kp-notebook-annotations-pane span.kp-notebook-metadata";
const noteBlocksSelector = "#kp-notebook-annotations .kp-notebook-row-separator";
const noteSelector = "#highlight";
const highlightHeaderSelector = "#annotationHighlightHeader";
const booksSelector = "#kp-notebook-library .kp-notebook-library-each-book";
const bookNameSelector = "a h2";
const authorSelector = "a p";
const bookPhotoSelector = "a div.a-row img";

export const fetchBooksFromKindle = async (): Promise<Book[]> => {
    const browser = await launchBrowser();
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
                    notes: [],
                };
        }),
        authorSelector,
        bookNameSelector,
        bookPhotoSelector
    );
    logger.info(`Found ${books.length} books`);
    for (const book of books) {
        logger.info(`Fetching notes for books ${book.name}`);
        book.notes = await fetchNotes(book.id, browser);
    }
    logger.info(`Finish fetching books, found ${books.length}. Closing browser`);
    await browser.close();
    logger.info("Browser closed");
    return books;
};

/**
 * Get book from markdown files. Return null if not found
 */
export const getBook = async (id: string): Promise<Book | null> => {
    const markdown = await FileService.getMarkdown(id);
    if (!markdown) {
        return null;
    }
    return markdownToBook(markdown.content);
};

export const toMarkdown = (book: Book): string => {
    let retVal = frontMatter(book);
    for (const note of book.notes) {
        retVal += Transformers.noteToMarkdown(note);
    }
    return retVal;
};

export const markdownToBook = (markdown: string): Book => {
    const frontMatter = fm(markdown);
    if (frontMatter.attributes === null) {
        throw new Error(`Invalid markdown content ${markdown}`);
    }
    return {
        id: frontMatter.attributes.id,
        name: frontMatter.attributes.name,
        author: frontMatter.attributes.author,
        photo: frontMatter.attributes.photo,
        notes: toNotes(frontMatter.body),
    };
};

/**
 * Copy user-data e.g. backside, excluded
 */
export const copyUserData = (from: Book, to: Book) => {
    const fromNotes: {
        [key: string]: Note
    } = _.fromPairs(from.notes.map(note => ([note.hash, note])));
    for (const note of to.notes) {
        if (fromNotes[note.hash]) {
            note.excluded = fromNotes[note.hash].excluded;
            note.backside = fromNotes[note.hash].backside;
        }
    }
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
    await notesPage.waitForSelector(bookMetadataSelector, { visible: true });

    // getting notes
    const rawNotes = await notesPage.$$eval(
        noteBlocksSelector,
        Pages.extractRawNotePageFn,
        noteSelector, highlightHeaderSelector
    );
    logger.info(`Found ${rawNotes.length} raw-notes for book ${bookId}`);
    return rawNotes.map(Transformers.rawNoteToNote);
};

const ensureNotesPage = async (browser: puppeteer.Browser): Promise<Page> => {
    const [retVal] = await browser.pages();
    if (await foundElement(retVal, notesContainerSelector)) {
        return retVal;
    }
    // login
    await retVal.goto(notesPageUrl);
    await retVal.waitForFunction((emailSelector: string, passwordSelector: string, notesContainerSelector: string) => {
        const loginPage = document.querySelector(emailSelector) || document.querySelector(passwordSelector);
        const notesPage = document.querySelector(notesContainerSelector);
        return loginPage || notesPage;
    }, {}, emailSelector, passwordSelector, notesContainerSelector);
    if (await isLoginPage(retVal)) {
        if (await foundElement(retVal, emailSelector)) {
            await retVal.focus(emailSelector);
            await retVal.keyboard.type(config.user.email);
        }
        await retVal.focus(passwordSelector);
        await retVal.keyboard.type(config.user.password);

        await retVal.keyboard.press("Enter");
    }

    // getting notes
    await retVal.waitForSelector(notesContainerSelector, { visible: true });
    return retVal;
};

const launchBrowser = async (): Promise<puppeteer.Browser> => {
    return puppeteer.launch({
        headless: config.isHeadless(),
        userDataDir: config.browserDataPath,
    });
};

const isLoginPage = async (page: Page | null): Promise<boolean> => {
    return await foundElement(page, emailSelector) || await foundElement(page, passwordSelector);
};

const foundElement = async (page: Page | null, selector: string): Promise<boolean> => {
    const retVal = page && await page.$(selector);
    logger.info(`Finding element "${selector}" in page. Found: ${!!retVal}`);
    return !!retVal;
};

const getBookLinkSelector = (id: string): string => `div#kp-notebook-library div#${id} a`;

const frontMatter = (book: Book) => {
    return `---
id: ${book.id}
name: "${book.name}"
---
`;
};

const toNotes = (markdownBody: string): Note[] => {
    const notes = markdownBody.split("##\n");
    return notes
        .map(note => (`##\n${note}`))
        .map(Transformers.mardownToNote)
        .filter(note => !!note.content);
};

const waitForVisibleAndClick = async (page: Page, selector: string) => {
    await page.waitForSelector(selector, { visible: true });
    await page.click(selector);
};
