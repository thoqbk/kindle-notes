import { Page } from "puppeteer";
import * as puppeteer from "puppeteer";
import * as yaml from "js-yaml";
import logger from "../logger";
import config from "../config";
import * as Pages from "../utils/pages";
import { Book, Note, RawNote } from "../types/services";

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

export const fetchBooks = async (): Promise<Book[]> => {
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

export const toMarkdown = (book: Book): string => {
    let retVal = frontMatter(book);
    for (const note of book.notes) {
        retVal += noteToMarkdown(note);
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
    return rawNotes.map(rawNoteToNote);
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
        headless: config.headless,
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
    const notes = markdownBody.split(/##\n/);
    return notes.map(toNote).filter(note => !!note.content);
};

const toNote = (markdown: string): Note => {
    const retVal: Note = {
        id: "na",
        content: markdown.replace(/\<\!\-\-([^]+)\-\-\>/g, "").trim(),
    };
    const metadataBlock = markdown.match(/\<\!\-\-([^]+)\-\-\>/);
    if (metadataBlock !== null && metadataBlock.length >= 2) {
        const metadata: any = yaml.load(metadataBlock[1]);
        retVal.location = metadata.location;
        retVal.excluded = metadata.excluded;
        retVal.page = metadata.page;
    }
    return retVal;
};

const noteToMarkdown = (note: Note): string => {
    let metadata = "";
    if (note.excluded === true) {
        metadata += (metadata && "\n") + "excluded: true";
    }
    if (!!note.location) {
        metadata += (metadata && "\n") + `location: ${note.location}`;
    }
    if (!!note.page) {
        metadata += (metadata && "\n") + `page: ${note.page}`;
    }
    if (metadata) {
        metadata = `\n\n<!--\n${metadata}\n-->`;
    }
    return `\n##\n${note.content}${metadata}\n`;
};

const waitForVisibleAndClick = async (page: Page, selector: string) => {
    await page.waitForSelector(selector, { visible: true });
    await page.click(selector);
};

const rawNoteToNote = (note: RawNote): Note => {
    const idItems = note?.rawId.split("-");
    const id = (idItems && idItems.length === 2 && idItems[1]) || "";

    const pageItems = note.highlightHeader?.split("Page:");
    const locationItems = note.highlightHeader?.split("Location:");

    return {
        id,
        content: note.content,
        page: pageItems?.length === 2 ? +(pageItems[1].replace(/\D/g, "")) : undefined,
        location: locationItems?.length === 2 ? +locationItems[1].replace(/\D/g, "") : undefined
    };
};
