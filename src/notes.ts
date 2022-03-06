import { Page } from "puppeteer";
import * as puppeteer from "puppeteer";
import logger from './logger';

const readPageUrl = "https://read.amazon.com";
const gotoNotesSelector = "button#notes_button h3";
const emailSelector = "input[type='email']";
const passwordSelector = "input[type='password']";
const notesContainerSelector = "div#kp-notebook-annotations";
const notesSelector = "span#highlight";

const email = "";
const password = "";

const isNotesPage = async (page: Page | null): Promise<boolean> => {
    if (page === null) {
        return false;
    }
    const title = await page.title();
    logger.info(`Checking page with title: "${title}"`);
    return !!(title && title.toLowerCase().indexOf("your notes") >= 0);
};

export const fetchNotes = async () => {
    logger.info("Fetching notes");
    const browser = await puppeteer.launch({
        headless: true,
    });
    const readPage = await browser.newPage();
    // login
    await readPage.goto(readPageUrl);
    await readPage.waitForSelector(emailSelector);
    await readPage.waitForSelector(passwordSelector);
    
    await readPage.focus(emailSelector);
    await readPage.keyboard.type(email);
    await readPage.focus(passwordSelector);
    await readPage.keyboard.type(password);

    await readPage.keyboard.press("Enter");

    // library page
    await readPage.waitForSelector(gotoNotesSelector);
    await readPage.click(gotoNotesSelector);

    // notes page
    await browser.waitForTarget(async (target) => {
        const page = await target.page();
        return await isNotesPage(page);
    });
    let notesPage: Page | null = null;
    for (const page of await browser.pages()) {
        if (await isNotesPage(page)) {
            notesPage = page;
            logger.info("Found notesPage");
            break;
        }
    }

    // getting notes
    notesPage && await notesPage.waitForSelector(notesContainerSelector);
    const notes: any = notesPage && await notesPage.$$eval(
        notesSelector,
        elements => elements.map(e => e.textContent)
    );
    for (const note of notes) {
        logger.info(note);
    }
    logger.info("Finish reading notes. Closing browser");
    await browser.close();
    logger.info("Browser closed");
};
