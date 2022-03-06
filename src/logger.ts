import * as vscode from "vscode";

const channel = vscode.window.createOutputChannel("Kindle Notes");
channel.show();

const info = (...args: any[]) => {
    if (!args || !args.length) {
        return;
    }
    let message = "";
    for (const arg of args) {
        message += arg;
    }
    if (message) {
        channel.appendLine(message);
    }
};

export default {
    info,
};
