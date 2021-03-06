import * as vscode from "vscode";
import config from "./config";

const channel = vscode.window.createOutputChannel("Kindle Notes");
if (config.showLogger()) {
    channel.show();
}

const log = (severity: String, ...args: any[]) => {
    if (!args || !args.length) {
        return;
    }
    let message = "";
    for (const arg of args) {
        message += arg;
    }
    if (message) {
        channel.appendLine(`${severity} - ${message}`);
    }
};

const info = (...args: any[]) => {
    log("INFO", ...args);
};

const error = (...args: any[]) => {
    log("ERROR", ...args);
};

export default {
    info,
    error,
};
