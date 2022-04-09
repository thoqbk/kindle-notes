import * as vscode from "vscode";
import * as FlashcardService from "../services/flashcard-service";
import * as BookService from "../services/book-service";
import * as Files from "../utils/files";
import * as path from "path";
import { FlashcardDto, StudySession } from "../types/services";
import logger from "../logger";
import * as open from "open";

const defaultTotalFlashcards = 10;

let currentSession: StudySession | undefined;
let currentFlashcard: FlashcardDto | undefined;
let currentPanel: vscode.WebviewPanel | undefined;

type OpenKindlePayload = {
    bookId: string;
    location?: number;
    page?: number;
};

type OpenFlashcardMarkdownPayload = {
    bookId: string;
    flashcardHash: string;
};

const viewType = "kindleNotes";

export const openFlashcards = async (context: vscode.ExtensionContext, bookId?: string) => {
    const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
    if (currentPanel) {
        logger.info("There's already a Kindle Notes webview, make it active instead of creating a new one");
        currentPanel.reveal(column);
        return;
    }
    const webviewOption: vscode.WebviewOptions = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "out", "web")]
    };
    currentPanel = vscode.window.createWebviewPanel(viewType, "Kindle Notes", column, webviewOption);
    currentPanel.webview.html = await getHtmlForWebView(currentPanel.webview, context);
    currentPanel.webview.onDidReceiveMessage(onDidReceiveMessage);
    currentPanel.onDidDispose(onDidDispose, null, context.subscriptions);
    currentFlashcard = undefined;
    currentSession = await FlashcardService.newStudySession({
        bookId,
        totalFlashcards: defaultTotalFlashcards,
    });
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
            logger.info(`Received result from webview. Grade ${message.payload.grade}`);
            if (!currentSession || !currentFlashcard) {
                throw new Error(`Cannot submitResult due to invalid session state`);
            }
            await FlashcardService.saveResult({
                sessionId: currentSession.id,
                flashcardHash: currentFlashcard.hash,
                grade: message.payload.grade,
            });
            await nextFlashcard();
            break;
        }
        case "closeWebview": {
            currentPanel?.dispose();
            break;
        }
        case "openKindle": {
            const url = buildUrl(message.payload);
            logger.info(`Opening Kindle using url ${url}`);
            await open(url);
            break;
        };
        case "openFlashcardMarkdown": {
            openFlashcardMarkdown(message.payload);
            break;
        };
        default: {
            logger.info(`Receive unknown message type from webview: ${message.type}`);
        }
    }
};

const onDidDispose = () => {
    currentSession = undefined;
    currentPanel = undefined;
    logger.info("Released resources because webview was disposed");
};

const initFlashcard = async () => {
    if (!currentPanel || !currentSession) {
        return;
    }
    if (currentSession.shown === 0) {
        await nextFlashcard();
        return;
    }
    if (currentFlashcard) {
        await FlashcardService.refreshCards([currentFlashcard]);
        sendCurrentFlashcard(currentPanel, "initFlashcard");
    }
};

const nextFlashcard = async () => {
    if (!currentPanel || !currentSession) {
        return;
    }
    if (currentFlashcard && currentFlashcard.position === currentFlashcard.totalFlashcards - 1) {
        currentPanel.webview.postMessage({ type: "completed" });
    } else {
        currentFlashcard = await FlashcardService.nextFlashcard(currentSession.id);
        sendCurrentFlashcard(currentPanel, "nextFlashcard");
    }
};

const sendCurrentFlashcard = (panel: vscode.WebviewPanel, type: string) => {
    panel.webview.postMessage({
        type,
        payload: {
            flashcard: currentFlashcard,
        },
    });
};

const buildUrl = (request: OpenKindlePayload): string => {
    let retVal = `kindle://book?action=open&asin=${request.bookId}`;
    if (request.location) {
        retVal += `&location=${request.location}`;
    } else if (request.page) {
        retVal += `&page=${request.page}`;
    }
    return retVal;
};

const openFlashcardMarkdown = async (payload: OpenFlashcardMarkdownPayload) => {
    const location = await BookService.getFlashcardLocation(payload.bookId, payload.flashcardHash);
    if (!location) {
        logger.error(`Flashcard not found. BookId ${payload.bookId}, hash ${payload.flashcardHash}`);
        return;
    }
    logger.info(`Opening markdownfile ${location.fullFilePath}`);
    await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(location.fullFilePath));
    await vscode.commands.executeCommand("revealLine", {
        lineNumber: location.line + 1,
        at: "center",
    });
    const editor = vscode.window.activeTextEditor;
    const range = editor?.document.lineAt(location.line).range;
    if (editor && range) {
        editor.selection = new vscode.Selection(range.start, range.end);
    } else {
        logger.info(`Cannot open markdown file ${location.fullFilePath}, line ${location.line}`);
    }
};
