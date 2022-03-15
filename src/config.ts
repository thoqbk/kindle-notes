import * as vscode from "vscode";
import * as path from "path";
import * as files from "./files";
import * as fs from "fs";
import * as dotenv from "dotenv";
import logger from "./logger";

const envPath = path.join(__dirname, "..", "src", ".env");
if (fs.existsSync(envPath)) {
    logger.info(`Using ${envPath} file to supply config environment variables`);
    dotenv.config({ path: envPath });
}

const extensionId = "thoqbk.kindle-notes";
const extensionPath = vscode.extensions.getExtension(extensionId)?.extensionPath || "/tmp";
const dataPath = path.join(extensionPath, "data");
const browserDataPath = path.join(dataPath, "browser");

files.checkAndCreate(dataPath);
files.checkAndCreate(browserDataPath);

const config = {
    extensionId,
    extensionPath,
    dataPath,
    browserDataPath,
    user: {
        email: process.env.KINDLE_NOTES_EMAIL || "",
        password: process.env.KINDLE_NOTES_PASSWORD || "",
    },
    headless: !(process.env.KINDLE_NOTES_HEADLESS === "false"),
    flashcardsHomePath: process.env.FLASHCARDS_HOME_PATH as string,
};

export default config;
