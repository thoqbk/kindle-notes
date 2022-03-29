import * as vscode from "vscode";
import * as path from "path";
import * as files from "./utils/files";
import * as fs from "fs";
import * as dotenv from "dotenv";
import logger from "./logger";
import constants from "./constants";

const envPath = path.join(__dirname, "..", "src", ".env");
if (fs.existsSync(envPath)) {
    logger.info(`Using ${envPath} file to supply config environment variables`);
    dotenv.config({ path: envPath });
}

const extensionId = "thoqbk.kindle-notes";
const extensionPath = vscode.extensions.getExtension(extensionId)?.extensionPath || "/tmp";
const dataPath = path.join(extensionPath, "data");
const browserDataPath = path.join(dataPath, "browser");
const webPath = path.join(extensionPath, "out", "web");

files.checkAndCreate(dataPath);
files.checkAndCreate(browserDataPath);

const getConfig = (key: string): any => {
    return vscode.workspace.getConfiguration(constants.kindleNotesConfigKey).get(key);
};

const config = {
    env: process.env.ENV,
    extensionId,
    extensionPath,
    dataPath,
    browserDataPath,
    user: {
        email: process.env.KINDLE_NOTES_EMAIL || "",
        password: process.env.KINDLE_NOTES_PASSWORD || "",
    },
    isHeadless: () => !!getConfig(constants.headlessBrowserConfigKey),
    getFlashcardsHomePath: () => getConfig(constants.flashcardsHomePathConfigKey),
    webPath,
};

export default config;
