import * as util from "util";
import * as vscode from "vscode";
import * as _ from "lodash";
import logger from "../logger";
import * as KindleService from "../services/kindle-service";
import * as BookService from "../services/book-service";
import constants from "../constants";
import { downloadBrowser } from "puppeteer/lib/cjs/puppeteer/node/install";

const keychain = require("keychain");

const getPassword = util.promisify(keychain.getPassword).bind(keychain);
const setPassword = util.promisify(keychain.setPassword).bind(keychain);

export const syncBooks = async () => {
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Syncing",
        cancellable: false,
    }, async (progress, token) => {
        try {
            progress.report({ message: "checking Chromium status" });
            await checkOrDownloadChromium();
            await doSyncBooks(progress);
        } catch (e) {
            logger.error("Sync failed", e);
            vscode.window.showWarningMessage("Sync failed. Please try again");
        }
    });
};

const checkOrDownloadChromium = async () => {
    logger.info("Check or download Chromium");
    await downloadBrowser();
    logger.info("Chromium is ready to use");
};

const doSyncBooks = async (progress: vscode.Progress<{ message: string }>) => {
    const credentials = await getKindleEmailAndPassword();
    progress.report({ message: "logging into Kindle" });
    const requestForCredentials = !credentials || !(await KindleService.login(credentials[0], credentials[1]));
    if (requestForCredentials) {
        const currentKindleEmail = vscode.workspace.getConfiguration(constants.kindleNotesConfigKey).get(constants.kindleEmailConfigKey);
        const kindleEmail = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "Email",
            prompt: "Enter the email using to login to Kindle",
            value: currentKindleEmail as string || "",
        });
        if (!kindleEmail) {
            return;
        }
        const password = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            title: "Password",
            password: true,
        });
        if (!password) {
            return;
        }
        logger.info("Try logging in to Kindle using provided email and password...");
        if (await KindleService.login(kindleEmail, password)) {
            logger.info(`Login successfully with kindleEmail ${kindleEmail} and pwd. Saving credentials`);
            await vscode.workspace.getConfiguration(constants.kindleNotesConfigKey)
                .update(constants.kindleEmailConfigKey, kindleEmail, vscode.ConfigurationTarget.Global);
            logger.info("KindleEmail was saved");
            try {
                await setPassword({
                    account: constants.accountNameInKeyChain,
                    service: constants.serviceInKeyChain,
                    type: constants.typeInKeyChain,
                    password,
                });
                logger.info("Password was saved in KeyChain");
            } catch (e) {
                logger.error(`Cannot save password to KeyChain`, e);
            }
        } else {
            logger.info("Incorrect email or password");
            vscode.window.showInformationMessage("Stop syncing because email or password is incorrect");
            return;
        }
    }
    logger.info("Syncing books from Kindle");
    const books = await KindleService.fetchBooks(progress);
    await BookService.saveBooks(books);
    logger.info(`Sync ${books.length} book(s) successfully`);
    vscode.window.showInformationMessage(`${books.length} book(s) have been synced`);
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

const getKindleEmailAndPassword = async (): Promise<[string, string] | null> => {
    const kindleEmail = vscode.workspace.getConfiguration(constants.kindleNotesConfigKey).get(constants.kindleEmailConfigKey);
    if (!kindleEmail) {
        return null;
    }
    let password: string = "";
    try {
        password = await getPassword({
            account: constants.accountNameInKeyChain,
            service: constants.serviceInKeyChain,
            type: constants.typeInKeyChain,
        });
    } catch (e) {
        logger.error("Cannot get the password from KeyChain", e);
    }
    if (!password) {
        return null;
    }
    return [kindleEmail as string, password];
};
