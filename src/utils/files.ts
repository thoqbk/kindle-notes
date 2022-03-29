import * as fs from "fs";
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
