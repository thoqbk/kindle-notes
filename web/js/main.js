window.addEventListener("message", event => {
    const message = event.data; // { type, payload }
    console.log("Receiving new message from KN", message);
    switch (message.type) {
        case "nextFlashcard": {
            loadFlashcard(message.payload);
            break;
        }
        default: {
            console.log(`Receiving invalid message. Message type ${message.type}`);
        }
    }
});

const submitResult = (level) => {
    window.vscode.postMessage({
        type: "submitResult",
        payload: {
            level,
        }
    });
};

const loadFlashcard = (flashcard) => {
    $("#flashcard-body").text(flashcard.body);
    $("#flashcard-book-name").text(flashcard.bookName);
};

$(() => {
    window.vscode = acquireVsCodeApi();
    window.vscode.postMessage({
        type: "firstFlashcard",
    });
});
