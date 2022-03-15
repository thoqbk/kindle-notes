import * as fs from "fs/promises";
import * as path from "path";
import { Markdown } from "../types/services";

import config from "../config";
import logger from "../logger";

const fm = require("front-matter");

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
                title: attributes.title,
                fileName: markdownFile,
            });
        }
    }
    return retVal;
};
