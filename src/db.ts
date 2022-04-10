import { Db } from "./types/services";
import * as path from "path";
import * as fs from "fs/promises";
import config from "./config";
import * as Files from "./utils/files";
import logger from "./logger";

const dbPath = path.join(config.getFlashcardsHomePath(), "db.json");

const save = async (): Promise<void> => {
    const data = JSON.stringify({
        sessions: db.sessions,
        sm2: db.sm2,
    });
    await fs.writeFile(dbPath, data, "utf8");
    logger.info("Db was persisted");
};

const db: Db = {
    sessions: [],
    sm2: [],
    save,
};

const load = async (): Promise<void> => {
    if (Files.exists(dbPath)) {
        const data = JSON.parse(await fs.readFile(dbPath, "utf8"));
        db.sessions = data.sessions;
        db.sm2 = data.sm2;
    }
};

load().then(() => {
    logger.info("Db was loaded");
}).catch((e) => {
    logger.error(`Cannot load db file ${dbPath}`, e);
});

export default db;
