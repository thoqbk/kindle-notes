import * as fs from "fs";
import { readdir as readdirAsync } from "fs/promises";
import * as path from "path";
import config from "../config";
import logger from "../logger";

export const checkAndCreate = (dirPath: string) => {
    if (!dirExists(dirPath)) {
        logger.info(`Creating dir ${dirPath}`);
        fs.mkdirSync(dirPath);
    }
};

export const dirExists = (dirPath: string) => {
    return fs.existsSync(dirPath);
};

/**
 * 
 * @param folderPath relative folderPath e.g. `out/web`
 * @param extension e.g. `.js`
 */
 export const getFileNames = async (folderPath: string, extension?: string): Promise<string[]> => {
    const fileNames = await readdirAsync(path.join(config.extensionPath, folderPath));
    return fileNames.filter(fn => !extension || path.extname(fn) === extension);
};
