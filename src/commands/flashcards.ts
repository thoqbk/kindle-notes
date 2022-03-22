import * as vscode from "vscode";
import * as FileService from "../services/file-service";
import * as FlashcardService from "../services/flashcard-service";
import * as path from "path";
import { Flashcard } from "../types/services";
import logger from "../logger";

let currentFlashcardIdx = -1;
let currentFlashcards: Flashcard[] = [];
let currentPanel: vscode.WebviewPanel | null = null;

const viewType = "catCoding";

export const openFlashcards = async (context: vscode.ExtensionContext) => {
    const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
    if (currentPanel !== null) {
        logger.info("There's already a Kindle Notes webview, make it active instead of creating a new one");
        currentPanel.reveal(column);
        return;
    }
    const webviewOption: vscode.WebviewOptions = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "web")]
    };
    currentPanel = vscode.window.createWebviewPanel(viewType, "Cat Coding", column, webviewOption);
    currentPanel.webview.html = await getHtmlForWebView(currentPanel.webview, context);
    currentPanel.webview.onDidReceiveMessage(onDidReceiveMessage);
    currentPanel.onDidDispose(onDidDispose, null, context.subscriptions);
    currentFlashcards = await FlashcardService.generate();
};

const getHtmlForWebView = async (webview: vscode.Webview, context: vscode.ExtensionContext): Promise<string> => {
    const retVal = await FileService.getFileContent("web/index.html") || "content not found";
    const root = webview.asWebviewUri(vscode.Uri.file(
        path.join(context.extensionPath, "web")
    ));
    return retVal.replace(/__ROOT__/g, root.toString());
};

const onDidReceiveMessage = (message: any) => {
    logger.info(`Receiving new request from webview ${message.type}`);
    switch (message.type) {
        case "firstFlashcard": {
            nextFlashcard();
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

const nextFlashcard = () => {
    if (currentPanel === null) {
        return;
    }
    currentFlashcardIdx++;
    if (currentFlashcardIdx < currentFlashcards.length) {
        currentPanel.webview.postMessage({
            type: "nextFlashcard",
            payload: {
                flashcard: currentFlashcards[currentFlashcardIdx],
                totalFlashcards: currentFlashcards.length,
            },
        });
    } else {
        currentPanel.webview.postMessage({
            type: "completed",
        });
    }
};
