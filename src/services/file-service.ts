import * as fs from "fs/promises";
import { constants as fsConstants } from "fs";
import * as path from "path";
import { Markdown } from "../types/services";

import config from "../config";
import logger from "../logger";

const fm = require("front-matter");
const fileContentCache: {
    [key: string]: string
} = {};

export const allMarkdowns = async (): Promise<Markdown[]> => {
    const retVal: Markdown[] = [];
    logger.info("Getting all markdowns file");
    const fileNames = await fs.readdir(config.flashcardsHomePath);
    const markdownFiles = fileNames.filter(fileName => path.extname(fileName) === ".md");
    logger.info(`Found ${markdownFiles.length} markdown files`);
    
    for (const markdownFile of markdownFiles) {
        const data = await fs.readFile(path.join(config.flashcardsHomePath, markdownFile), "utf8");
        const content = fm(data);
        const attributes = content.attributes as any;
        if (content.attributes !== null) {
            retVal.push({
                id: attributes.id,
                name: attributes.name,
                fileName: markdownFile,
                content: data,
            });
        }
    }
    return retVal;
};

/**
* Read and cache file content. Return null if file not found
* @param filePath: relative file path from extension root folder
*/
export const getFileContent = async (filePath: string): Promise<string | null> => {
    if (fileContentCache[filePath]) {
        return fileContentCache[filePath];
    }
    const fullFilePath = path.join(config.extensionPath, filePath);
    if (config.env !== "DEV" && !(await exists(fullFilePath))) {
        logger.info(`File not exists ${fullFilePath}`);
        return null;
    }
    const retVal = await fs.readFile(fullFilePath, "utf8");
    fileContentCache[filePath] = retVal;
    return retVal;
};

/**
 * 
 * @param folderPath relative folderPath e.g. `out/web`
 * @param extension e.g. `.js`
 */
export const getFileNames = async (folderPath: string, extension?: string): Promise<string[]> => {
    const fileNames = await fs.readdir(path.join(config.extensionPath, folderPath));
    return fileNames.filter(fn => !extension || path.extname(fn) === extension);
};

const exists = async (fullFilePath: string): Promise<boolean> => {
    try {
        fs.access(fullFilePath, fsConstants.F_OK);
        return true;
    } catch (e) {
        return false;
    }
};
