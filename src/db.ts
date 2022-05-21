import * as os from "os";
import { Db, DbData } from "./types/services";
import * as path from "path";
import * as fs from "fs/promises";
import config from "./config";
import * as Files from "./utils/files";
import logger from "./logger";

const defaultDb = (): DbData => ({
    sessions: [],
    sm2: [],
});

let dbData: DbData = defaultDb();

let lastLoadedDbPath = "";

const save = async (savingData: DbData): Promise<void> => {
    dbData = savingData;
    const dataInString = JSON.stringify(dbData);
    await fs.writeFile(getDbPath(), dataInString, "utf8");
    logger.info("Db was persisted");
};

const load = async (): Promise<DbData> => {
    const dbPath = getDbPath();
    if (dbPath === lastLoadedDbPath) {
        return dbData;
    }
    logger.info(`Loading Db from ${dbPath}`);
    if (Files.exists(dbPath)) {
        dbData = JSON.parse(await fs.readFile(dbPath, "utf8"));
        lastLoadedDbPath = dbPath;
        logger.info("Db was loaded");
        return dbData;
    }
    return defaultDb();
};

const clearCache = () => {
    lastLoadedDbPath = "";
    dbData = defaultDb();
};

const db: Db = {
    save,
    load,
    clearCache,
};

const getDbPath = () => path.join(
    os.tmpdir(),
    `${config.isUnitTesting ? "test-" : ""}kindle-notes-db.json`
);

export default db;
