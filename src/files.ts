import * as fs from "fs";
import logger from "./logger";

export const checkAndCreate = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        logger.info(`Creating dir ${dirPath}`);
        fs.mkdirSync(dirPath);
    }
};
