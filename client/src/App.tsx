import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScanUpload from './pages/scan/ScanUpload';
import ScanReview from './pages/scan/ScanReview';
import BusinessPage from './pages/business/BusinessPage';
import AuthCallback from './pages/auth/AuthCallback';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import Dashboard from './pages/dashboard/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/scan" element={<ScanUpload />} />
        <Route path="/scan/review" element={<ScanReview />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/select-business" element={<BusinessPage/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
      </Routes>
    </Router>
  );
}

export default App;