import * as fs from "fs";
import * as os from "os";
import { readdir as readdirAsync } from "fs/promises";
import * as path from "path";
import config from "../config";
import logger from "../logger";
import constants from "../constants";

export const checkOrCreate = (dirPath: string) => {
    if (!exists(dirPath)) {
        logger.info(`Creating dir ${dirPath}`);
        fs.mkdirSync(dirPath);
    }
};

/**
 * Check if file or dir exists
 */
export const exists = (filePath: string) => {
    return fs.existsSync(filePath);
};

/**
 * 
 * @param folderPath absolute path
 * @param extension e.g. `.js`
 * @returns file names with extension e.g. ["hello.md", "vietnam.md"]
 */
export const getFileNames = async (folderPath: string, extension?: string): Promise<string[]> => {
    const fileNames = await readdirAsync(folderPath);
    return fileNames.filter(fn => !extension || path.extname(fn) === extension);
};

export const determineFileName = (bookName: string): string => {
    if (!bookName || !bookName.trim().length) {
        throw new Error(`Invalid book name ${bookName}`);
    }
    const removeNotedWords = bookName.toLowerCase().replace(/\(.+\)/g, " ");

    // check 5 words constraints
    const words = removeNotedWords.replace(/[^a-z1-9]/g, " ").trim().split(/\s+/).length;
    if (words <= 5) {
        return rawNameToFileName(removeNotedWords);
    }

    const colonSplits = removeNotedWords.split(":");
    const dashSplits = removeNotedWords.split(" - ");
    let rawName = removeNotedWords;
    if (colonSplits.length >= 2 && colonSplits[0].trim().length) {
        rawName = colonSplits[0];
    } else if (dashSplits.length >= 2 && dashSplits[0].trim().length) {
        rawName = dashSplits[0];
    }
    return rawNameToFileName(rawName);
};

/**
 * On Windows, selected directory path from `vscode.window.showOpenDialog`
 * return incorrect path e.g. `/C:/a/b/c` instead of `C:\a\b\c`.
 * 
 * This function is to check and fix that
 */
export const checkAndFixWinSelectedPath = (selectedPath: string): string => {
    if (os.platform() !== "win32") {
        return selectedPath;
    }
    return selectedPath.split(/[\/\\]/).filter(i => i).join("\\");
};

/**
 * Create `flashcards` dir, update config if not exists
 * 
 * @returns full path to flashcards dir
 */
export const getOrCreateFlashcardsDir = async (): Promise<string> => {
    if (config.getFlashcardsHomePath()) {
        return config.getFlashcardsHomePath();
    }
    const retVal = path.join(os.homedir(), "flashcards");
    checkOrCreate(retVal);
    await config.updateConfig(constants.flashcardsHomePathConfigKey, retVal);
    return retVal;
};

const rawNameToFileName = (rawName: string): string => {
    return rawName.replace(/[^a-z1-9]/g, " ").trim().replace(/\s+/g, "-") + ".md";
};
