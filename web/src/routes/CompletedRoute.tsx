import { closeWebview } from "../utils/vscode";

const CompletedRoute = () => {
  return (
    <div className="container completed-page">
      <div className="inner cover">
        <p className="lead">You have completed 10 cards</p>
        <button type="button" className="btn btn-success" onClick={closeWebview}>Close</button>
      </div>
    </div>
  );
};

export default CompletedRoute;
