window.addEventListener("message", event => {
    const message = event.data; // { type, payload }
    console.log("Receiving new message from KN", message);
    switch (message.type) {
        case "firstFlashcard": {
            loadFlashcard(message.payload);
            break;
        }
        case "nextFlashcard": {
            loadFlashcard(message.payload);
            break;
        }
        case "completed": {
            showCompletedPage();
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

const loadFlashcard = (payload) => {
    window.totalFlashcards = payload.totalFlashcards;
    $("#flashcard-body").text(payload.flashcard.body);
    $("#flashcard-book-name").text(payload.flashcard.bookName);
    $("#flashcard-progress").text(`${payload.flashcard.position + 1} of ${payload.totalFlashcards}`);
};

const closeWebview = () => {
    window.vscode.postMessage({
        type: "closeWebview"
    });
};

const showCompletedPage = () => {
    $(".completed-page p.lead").text(`You have completed ${window.totalFlashcards} flashcards!`);
    $(".study-page").hide();
    $(".completed-page").show();
};

$(() => {
    window.vscode = acquireVsCodeApi();
    window.vscode.postMessage({
        type: "firstFlashcard",
    });
});
