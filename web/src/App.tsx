import { HashRouter, Route, Routes } from 'react-router-dom';
import FlashcardRoute from './routes/FlashcardRoute';
import CompletedRoute from './routes/CompletedRoute';

import './App.css';

const App = () => {
  return (
    <div className="site-wrapper">
      <div className="site-wrapper-inner">
        <HashRouter>
          <Routes>
            <Route path="/" element={<FlashcardRoute />} />
            <Route path="/completed" element={<CompletedRoute />} />
          </Routes>
        </HashRouter>
      </div>
    </div>
  );
}

export default App;
