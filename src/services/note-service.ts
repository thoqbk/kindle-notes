import { Page } from "puppeteer";
import * as puppeteer from "puppeteer";
import logger from "../logger";
import config from "../config";
import { Book, Note } from "../types/services";

const notesPageUrl = "https://read.amazon.com/notebook";
const emailSelector = "input[type='email']";
const passwordSelector = "input[type='password']";
const notesContainerSelector = "div#kp-notebook-annotations";
const notesSelector = "span#highlight";
const booksSelector = "#kp-notebook-library .kp-notebook-library-each-book";
const bookNameSelector = "a h2";
const authorSelector = "a p";
const bookPhotoSelector = "a div.a-row img";

export const fetchNotes = async (): Promise<Note[]> => {
    logger.info("Fetching notes");
    const browser = await launchBrowser();
    const notesPage = await ensureNotesPage(browser);

    // getting notes
    const retVal: Note[] = await notesPage.$$eval(
        notesSelector,
        elements => elements.map(element => {
            const idParts = element.parentElement?.id.split("-");
            return {
                content: element.textContent || "",
                id: (idParts && idParts.length === 2 && idParts[1]) || "",
            };
        })
    );
    for (const note of retVal) {
        logger.info(`${note.id} - ${note.content}`);
    }
    logger.info("Finish reading notes. Closing browser");
    await browser.close();
    logger.info("Browser closed");
    return retVal;
};

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
                };
        }),
        authorSelector,
        bookNameSelector,
        bookPhotoSelector
    );
    for (const book of books) {
        logger.info(`${book.id} - ${book.name} - ${book.photo}`);
    }
    logger.info(`Finish fetching books, found ${books.length}. Closing browser`);
    await browser.close();
    logger.info("Browser closed");
    return books;
};

const ensureNotesPage = async (browser: puppeteer.Browser): Promise<Page> => {
    const retVal = await browser.newPage();
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
    await retVal.waitForSelector(notesContainerSelector);
    return retVal;
};

const launchBrowser = async (): Promise<puppeteer.Browser> => {
    return puppeteer.launch({
        headless: config.headless,
        userDataDir: config.browserDataPath,
    });
};

const isNotesPage = async (page: Page | null): Promise<boolean> => {
    if (page === null) {
        return false;
    }
    const title = await page.title();
    logger.info(`Checking page with title: "${title}"`);
    return !!(title && title.toLowerCase().indexOf("your notes") >= 0);
};

const isLoginPage = async (page: Page | null): Promise<boolean> => {
    return await foundElement(page, emailSelector) || await foundElement(page, passwordSelector);
};

const foundElement = async (page: Page | null, selector: string): Promise<boolean> => {
    const retVal = page && await page.$(selector);
    logger.info(`Check element ${selector} in page. Result: ${!!retVal}`);
    return !!retVal;
};
