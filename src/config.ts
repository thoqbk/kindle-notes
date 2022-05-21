import * as fs from "fs";
import * as vscode from "vscode";
import * as path from "path";
import constants from "./constants";

const extensionId = "thoqbk.kindle-notes";
const extensionPath = vscode.extensions.getExtension(extensionId)?.extensionPath || "/tmp";
const dataPath = path.join(extensionPath, "data");
const browserDataPath = path.join(dataPath, "browser");
const webPath = path.join(extensionPath, "out", "web");

const getConfig = (key: string): any => {
    return vscode.workspace.getConfiguration(constants.kindleNotesConfigKey).get(key);
};

const updateConfig = async (key: string, value: string) => {
    const settings = vscode.workspace.getConfiguration(constants.kindleNotesConfigKey);
    await settings.update(key, value, vscode.ConfigurationTarget.Global);
};

const getFlashcardsHomePath = () => getConfig(constants.flashcardsHomePathConfigKey);

/**
 * show alert and throw exception if invalid or not exist
 */
const throwOrGetFlashcardsHomePath = () => {
    const retVal = getFlashcardsHomePath();
    const message = `Please goto settings and set "Kindle-notes: Flashcards Home Path" to a valid path`;
    if (!retVal || !fs.existsSync(retVal)) {
        vscode.window.showInformationMessage(message);
        throw new Error(message);
    }
    return retVal;
};

const config = {
    extensionId,
    extensionPath,
    dataPath,
    browserDataPath,
    isHeadless: () => !!getConfig(constants.headlessBrowserConfigKey),
    getFlashcardsHomePath, // null if not exist
    throwOrGetFlashcardsHomePath,
    showLogger: () => getConfig(constants.showLoggerConfigKey),
    webPath,
    getConfig,
    updateConfig,
    getFlashcardsPerStudySession: () => +getConfig(constants.flashcardsPerStudySessionConfigKey),
    isUnitTesting: false,
};

export default config;
