import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScanUpload from './pages/scan/ScanUpload';
import ScanReview from './pages/scan/ScanReview';
import BusinessPage from './pages/business/BusinessPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BusinessPage />} />
        <Route path="/scan" element={<ScanUpload />} />
        <Route path="/scan/review" element={<ScanReview />} />
      </Routes>
    </Router>
  );
}

export default App;
