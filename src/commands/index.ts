import * as vscode from "vscode";
import logger from "../logger";
import { openFlashcards } from "./flashcards";
import * as Transformers from "../utils/transformers";
import { syncBooks } from "./books";
import * as Files from "../utils/files";
import config from "../config";

const studyCommand = "kindle-notes.study";
const studyThisFileCommand = "kindle-notes.studyThisFile";
const syncBooksCommand = "kindle-notes.syncBooks";

const kindleNotesKey = "kindle-notes";
const flashcardsHomePathKey = "flashcardsHomePath";

export const registerCommands = (context: vscode.ExtensionContext) => {
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
                vscode.window.showErrorMessage("The current file is not a valid KindleNotes book");
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand(syncBooksCommand, () => {
        runCommand(syncBooksCommand, context, async () => {
            await syncBooks();
        });
    }));
};

type RunCommandFn = () => Promise<any>;

const runCommand = async (command: string, context: vscode.ExtensionContext, fn: RunCommandFn) => {
    logger.info(`Running command ${command}`);
    const flashcardsHomePath = config.getFlashcardsHomePath();
    if (Files.dirExists(flashcardsHomePath)) {
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
    const dirPath = value[0].path;
    if (!Files.dirExists(dirPath)) {
        vscode.window.showErrorMessage(`Invalid flashcards directory ${dirPath}`);
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
