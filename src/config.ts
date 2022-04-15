import * as vscode from "vscode";
import * as path from "path";
import constants from "./constants";

const extensionId = "thoqbk.kindle-notes";
const extensionPath = vscode.extensions.getExtension(extensionId)?.extensionPath || "/tmp";
const dataPath = path.join(extensionPath, "data");
const browserDataPath = path.join(dataPath, "browser");
const webPath = path.join(extensionPath, "out", "web");

const getConfig = (key: string): any => {
    return vscode.workspace.getConfiguration(constants.kindleNotesConfigKey).get(key);
};

const config = {
    extensionId,
    extensionPath,
    dataPath,
    browserDataPath,
    isHeadless: () => !!getConfig(constants.headlessBrowserConfigKey),
    getFlashcardsHomePath: () => getConfig(constants.flashcardsHomePathConfigKey),
    showLogger: () => getConfig(constants.showLoggerConfigKey),
    webPath,
};

export default config;
