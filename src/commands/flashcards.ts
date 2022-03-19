import * as vscode from "vscode";
import * as FileService from "../services/file-service";
import * as path from "path";

const viewType = "catCoding";

export const openFlashcards = async (context: vscode.ExtensionContext) => {
    const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
    const webviewOption: vscode.WebviewOptions = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "web")]
    };
    const panel = vscode.window.createWebviewPanel(viewType, "Cat Coding", column, webviewOption);
    panel.webview.html = await getHtmlForWebView(panel.webview, context);
};

const getHtmlForWebView = async (webview: vscode.Webview, context: vscode.ExtensionContext): Promise<string> => {
    const retVal = await FileService.getFileContent("web/index.html") || "content not found";
    const root = webview.asWebviewUri(vscode.Uri.file(
        path.join(context.extensionPath, "web")
    ));
    return retVal.replace("__ROOT__", root.toString());
};
