import * as fs from "fs";
import { readdir as readdirAsync } from "fs/promises";
import * as path from "path";
import config from "../config";
import logger from "../logger";

export const checkAndCreate = (dirPath: string) => {
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
 * @param folderPath relative folderPath e.g. `out/web`
 * @param extension e.g. `.js`
 * @returns file names with extension e.g. ["hello.md", "vietnam.md"]
 */
export const getFileNames = async (folderPath: string, extension?: string): Promise<string[]> => {
    const fileNames = await readdirAsync(path.join(config.extensionPath, folderPath));
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

const rawNameToFileName = (rawName: string): string => {
    return rawName.replace(/[^a-z1-9]/g, " ").trim().replace(/\s+/g, "-") + ".md";
};
