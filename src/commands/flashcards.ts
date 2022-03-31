import * as vscode from "vscode";
import * as FlashcardService from "../services/flashcard-service";
import * as Files from "../utils/files";
import * as path from "path";
import { FlashcardDto } from "../types/services";
import logger from "../logger";

let currentFlashcardIdx = -1;
let currentFlashcards: FlashcardDto[] = [];
let currentPanel: vscode.WebviewPanel | null = null;

const viewType = "catCoding";

export const openFlashcards = async (context: vscode.ExtensionContext, bookId?: string) => {
    const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
    if (currentPanel !== null) {
        logger.info("There's already a Kindle Notes webview, make it active instead of creating a new one");
        currentPanel.reveal(column);
        return;
    }
    const webviewOption: vscode.WebviewOptions = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "out", "web")]
    };
    currentPanel = vscode.window.createWebviewPanel(viewType, "Cat Coding", column, webviewOption);
    currentPanel.webview.html = await getHtmlForWebView(currentPanel.webview, context);
    currentPanel.webview.onDidReceiveMessage(onDidReceiveMessage);
    currentPanel.onDidDispose(onDidDispose, null, context.subscriptions);
    currentFlashcards = await FlashcardService.generate(bookId);
};

const getHtmlForWebView = async (webview: vscode.Webview, context: vscode.ExtensionContext): Promise<string> => {
    const cssFileNames = await Files.getFileNames(path.join("out", "web", "static", "css"), ".css");
    const jsFileNames = await Files.getFileNames(path.join("out", "web", "static", "js"), ".js");
    if (!cssFileNames.length || !jsFileNames.length) {
        return "content not found";
    }
    const root = webview.asWebviewUri(vscode.Uri.file(
        path.join(context.extensionPath, "out", "web", "static")
    )).toString();
    const cssLinks = cssFileNames.map(fn => `<link href="${root}/css/${fn}" rel="stylesheet">`).join("\n");
    const jsLinks = jsFileNames.map(fn => `<script defer="defer" src="${root}/js/${fn}"></script>`).join("\n");
    return `
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>Kindle Notes UI</title>
            ${jsLinks}
            ${cssLinks}
        </head>
        <body>
            <div id="root"></div>
        </body>
        </html>
    `;
};

const onDidReceiveMessage = async (message: any) => {
    logger.info(`Receiving new request from webview ${message.type}`);
    switch (message.type) {
        case "initFlashcard": { // received when the webview gets activated
            initFlashcard();
            break;
        }
        case "submitResult": {
            logger.info(`Received result from webview. Level ${message.payload.level}`);
            nextFlashcard();
            break;
        }
        case "closeWebview": {
            currentPanel?.dispose();
            break;
        }
        default: {
            logger.info(`Receive unknown message type from webview: ${message.type}`);
        }
    }
};

const onDidDispose = () => {
    currentFlashcardIdx = -1;
    currentFlashcards = [];
    currentPanel = null;
    logger.info("Released resources because webview was disposed");
};

const initFlashcard = async () => {
    if (currentPanel === null) {
        return;
    }
    if (currentFlashcardIdx === -1) {
        nextFlashcard();
        return;
    }
    currentFlashcards = await FlashcardService.refreshCards(currentFlashcards);
    sendCurrentFlashcard(currentPanel, "initFlashcard");
};

const nextFlashcard = () => {
    if (currentPanel === null) {
        return;
    }
    currentFlashcardIdx++;
    sendCurrentFlashcard(currentPanel, "nextFlashcard");
};

const sendCurrentFlashcard = (panel: vscode.WebviewPanel, type: string) => {
    if (currentFlashcardIdx < currentFlashcards.length) {
        panel.webview.postMessage({
            type,
            payload: {
                flashcard: currentFlashcards[currentFlashcardIdx],
            },
        });
    } else {
        panel.webview.postMessage({
            type: "completed",
        });
    }
};
