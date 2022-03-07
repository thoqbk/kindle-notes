import { Page } from "puppeteer";
import * as puppeteer from "puppeteer";
import logger from "../logger";
import config from "../config";

const notesPageUrl = "https://read.amazon.com/notebook";
const emailSelector = "input[type='email']";
const passwordSelector = "input[type='password']";
const notesContainerSelector = "div#kp-notebook-annotations";
const notesSelector = "span#highlight";

export const fetchNotes = async () => {
    logger.info("Fetching notes");
    const browser = await puppeteer.launch({
        headless: config.headless,
        userDataDir: config.browserDataPath,
    });
    const notesPage = await browser.newPage();
    // login
    await notesPage.goto(notesPageUrl);
    await notesPage.waitForFunction((emailSelector: string, passwordSelector: string, notesContainerSelector: string) => {
        const loginPage = document.querySelector(emailSelector) && document.querySelector(passwordSelector);
        const notesPage = document.querySelector(notesContainerSelector);
        return loginPage || notesPage;
    }, {}, emailSelector, passwordSelector, notesContainerSelector);
    if (await isLoginPage(notesPage)) {
        await notesPage.focus(emailSelector);
        await notesPage.keyboard.type(config.user.email);
        await notesPage.focus(passwordSelector);
        await notesPage.keyboard.type(config.user.password);

        await notesPage.keyboard.press("Enter");
    }

    // notes page
    await browser.waitForTarget(async (target) => {
        const page = await target.page();
        return await isNotesPage(page);
    });

    // getting notes
    await notesPage.waitForSelector(notesContainerSelector);
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

const isNotesPage = async (page: Page | null): Promise<boolean> => {
    if (page === null) {
        return false;
    }
    const title = await page.title();
    logger.info(`Checking page with title: "${title}"`);
    return !!(title && title.toLowerCase().indexOf("your notes") >= 0);
};

const isLoginPage = async (page: Page | null): Promise<boolean> => {
    return await foundElement(page, emailSelector)
        && await foundElement(page, passwordSelector);
};

const foundElement = async (page: Page | null, selector: string): Promise<boolean> => {
    const retVal = page && await page.$(selector);
    logger.info(`Check element ${selector} in page. Result: ${!!retVal}`);
    return !!retVal;
};
