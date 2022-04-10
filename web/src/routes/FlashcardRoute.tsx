import _ from "lodash";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FlashcardDto, FlashcardPayload } from "../types";
import { postMessage } from "../utils/vsCode";
import "./FlashcardRoute.css";

const defaultFlashcard: FlashcardDto = {
  hash: "abcz=",
  bookId: "B07D23CFGR",
  bookName: "System Design Interview – An insider's guide",
  content: "`CAP theorem` states it is impossible for a distributed system to simultaneously provide more than two of these three guarantees: consistency, availability, and partition tolerance.",
  backside: `Notes:
- Partition Tolerance: \`partition\` means commnication break between 2 nodes
- Consistency: clients see the same data no matter what node they connect to
- CA: cannot exist in real world because network failure is unavoidable --> always need \`P\`

Read more here: https://www.educative.io/blog/what-is-cap-theorem
`,
  location: 1373,
  position: 3,
  totalFlashcards: 10,
};

const FlashcardRoute = () => {
  const [flashcard, setFlashcard] = useState(defaultFlashcard);
  const [frontside, setFrontside] = useState(true);
  const [totalFlashcards, setTotalFlashcards] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFlashcard = (payload: FlashcardPayload) => {
      setFlashcard(payload.flashcard);
      setTotalFlashcards(payload.flashcard.totalFlashcards);
    };

    const received = (event: MessageEvent) => {
      const message = event.data;
      console.log("Receiving new message from KN", message);
      switch(message.type) {
        case "initFlashcard": {
          loadFlashcard(message.payload);
          break;
        }
        case "nextFlashcard": {
          loadFlashcard(message.payload);
          break;
        }
        case "completed": {
          navigate("/completed", { replace: true });
          break;
        }
        default: {
          console.log(`Receiving invalid message. Message type ${message.type}`);
        }
      }
    };

    window.addEventListener("message", received);
    postMessage({ type: "initFlashcard"});

    return () => {
      window.removeEventListener("message", received);
    }
  }, [navigate]);

  useEffect(() => {
    setFrontside(true);
  }, [flashcard]);

  const handleLevelClicked = (grade: number) => {
    postMessage({ type: "submitResult", payload: { grade } });
  };

  const handleOpenKindleClicked = () => {
    postMessage({
      type: "openKindle",
      payload: {
        bookId: flashcard.bookId,
        location: flashcard.location,
        page: flashcard.page,
      }
    });
  };

  const handleOpenFlashcardMarkdownClicked = () => {
    postMessage({
      type: "openFlashcardMarkdown",
      payload: {
        bookId: flashcard.bookId,
        flashcardHash: flashcard.hash,
      }
    });
  };

  const renderHeader = () => {
    return <div className="flashcard-header">
      {!frontside ? <span className="float-start flashcard-link" onClick={() => setFrontside(true)}>to frontside</span> : null}
      <span className="float-end flashcard-progress">{flashcard.position + 1} of {totalFlashcards}</span>
    </div>
  };

  const renderBody = () => {
    const content = frontside ? flashcard.content : flashcard.backside;
    return <p className="lead" id="flashcard-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content || ""}
      </ReactMarkdown>
    </p>
  };

  const renderBookName = () => (
    <p id="flashcard-book-name">
      {flashcard.bookName}
      {flashcard.location && ` (location: ${flashcard.location})`}
      {flashcard.page && ` (page: ${flashcard.page})`}
      {" "}
      <span className="flashcard-link" onClick={handleOpenKindleClicked}>open Kindle</span>
      {" "}/{" "}
      <span className="flashcard-link" onClick={handleOpenFlashcardMarkdownClicked}>open Markdown</span>
    </p>
  );

  const renderRevealButton = () => (
    <button type="button" className="btn reveal-btn" onClick={() => setFrontside(false)}>Reveal Answer</button>
  );

  const renderLevelButtons = () => _.times(5).map(n => {
    return <button onClick={() => handleLevelClicked(n)} type="button" className={`btn lvl-${n + 1}`} key={`btn-${n}`}>
      { n + 1 }
      { n === 0 ? (<><br/>Not At All</>) : null }
      { n === 4 ? (<><br/>Perfectly</>) : null }
    </button>
  });

  return (
    <div className="container study-page">
      <div className="inner cover">
        {renderHeader()}
        {renderBody()}
        <hr />
        {renderBookName()}
        <div className="lead btn-group">
          {(frontside && flashcard.backside) ? renderRevealButton() : renderLevelButtons()}
        </div>
      </div>
    </div>
  );
};

export default FlashcardRoute;
