export const postMessage = (message: any) => {
  const vsCode = getVsCodeApi();
  if (vsCode !== undefined) {
    console.log("Sending message to KN", message);
    vsCode.postMessage(message);
  }
};

export const closeWebview = () => {
  postMessage({ type: "closeWebview" });
};

const getVsCodeApi = (): any => {
  const anyWindow: any = window as any;
  if (anyWindow.vsCode === undefined && anyWindow.acquireVsCodeApi !== undefined) {
    anyWindow.vsCode = anyWindow.acquireVsCodeApi();
    console.log("Acquired vscode Api");
  }
  if (anyWindow.vsCode === undefined && anyWindow.acquireVsCodeApi !== undefined) {
    anyWindow.vsCode = anyWindow.acquireVsCodeApi();
    console.log("Acquired vscode Api");
  }
  return anyWindow.vsCode;
};
