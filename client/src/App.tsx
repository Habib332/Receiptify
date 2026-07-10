import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/dashboard/Dashboard';
import ScanUpload from './pages/scan/ScanUpload';
import ScanReview from './pages/scan/ScanReview';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scan" element={<ScanUpload />} />
        <Route path="/scan/review" element={<ScanReview />} />
      </Routes>
    </Router>
  );
}

export default App;
