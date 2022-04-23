import * as vscode from "vscode";
import logger from "../logger";
import { openFlashcards, openFlashcardsRepo } from "./flashcards";
import * as Transformers from "../utils/transformers";
import { syncBooks } from "./books";
import * as Files from "../utils/files";
import config from "../config";
import prettier, { shouldHandleOnWillSaveTextDocument } from "../utils/prettier";
import { now } from "../utils/times";

const studyCommand = "kindle-notes.study";
const studyThisFileCommand = "kindle-notes.studyThisFile";
const syncBooksCommand = "kindle-notes.syncBooks";
const openFlashcardsRepoCommand = "kindle-notes.openFlashcardsRepo";

const kindleNotesKey = "kindle-notes";
const flashcardsHomePathKey = "flashcardsHomePath";

export const registerCommands = (context: vscode.ExtensionContext) => {
    logger.info("Registering commands");
    context.subscriptions.push(vscode.commands.registerCommand(studyCommand, () => {
        runCommand(studyCommand, context, () => openFlashcards(context));
    }));
    context.subscriptions.push(vscode.commands.registerCommand(studyThisFileCommand, () => {
        runCommand(studyThisFileCommand, context, async () => {
            const markdown = vscode.window.activeTextEditor?.document?.getText() || "";
            const book = Transformers.markdownToBook(markdown);
            if (book.id) {
                await openFlashcards(context, book.id);
            } else {
                vscode.window.showInformationMessage("The current file is not a valid KindleNotes book");
                logger.error(`Invalid markdown content: ${markdown}`);
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand(syncBooksCommand, () => {
        runCommand(syncBooksCommand, context, async () => {
            await syncBooks();
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand(openFlashcardsRepoCommand, () => {
        runCommand(openFlashcardsRepoCommand, context, async () => {
            await openFlashcardsRepo();
        });
    }));
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument(handleOnWillSaveTextDocument));
    logger.info("All commands have been registered");
};

type RunCommandFn = () => Promise<any>;

const runCommand = async (command: string, context: vscode.ExtensionContext, fn: RunCommandFn) => {
    logger.info(`Running command ${command}`);
    const flashcardsHomePath = await Files.getOrCreateFlashcardsDir();
    if (Files.exists(flashcardsHomePath)) {
        return fn();
    }
    const cont = await vscode.window.showInformationMessage("Select the location of the flashcards directory to continue?", "Yes", "No");
    if (cont !== "Yes") {
        return;
    }
    const options: vscode.OpenDialogOptions = {
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
    };
    const value = await vscode.window.showOpenDialog(options);
    if (!value || value.length === 0) {
        return;
    }
    const dirPath = Files.checkAndFixWinSelectedPath(value[0].path);
    if (!Files.exists(dirPath)) {
        vscode.window.showInformationMessage(`Invalid flashcards directory ${dirPath}`);
        return;
    }
    const settings = vscode.workspace.getConfiguration(kindleNotesKey);
    await settings.update(flashcardsHomePathKey, dirPath, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Saved flashcards directory ${dirPath}`);
    try {
        await fn();
    } catch (e) {
        logger.error(`Failed when running ${command}. Error ${e}`);
    }
    logger.info(`Finish running command ${command}`);
};

const handleOnWillSaveTextDocument = (event: vscode.TextDocumentWillSaveEvent) => {
    const start = now();
    if (shouldHandleOnWillSaveTextDocument(event)) {
        const result = prettier(event.document.getText());
        if (result.status === "modified") {
            const firstLine = event.document.lineAt(0);
            const lastLine = event.document.lineAt(event.document.lineCount - 1);
            const textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
            const textEdit = vscode.TextEdit.replace(textRange, result.markdownContent);
            event.waitUntil(Promise.resolve([textEdit]));
            logger.info(`Prettier run in ${now() - start}ms`);
        }
    }
};
