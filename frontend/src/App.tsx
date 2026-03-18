import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { IDEPage } from './pages/IDEPage';
import { SkillDetailPage } from './pages/SkillDetailPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/skills/:author/:name" element={<SkillDetailPage />} />
        <Route path="/ide/:author/:name" element={<IDEPage />} />
        <Route path="/ide" element={<IDEPage />} />
      </Routes>
    </BrowserRouter>
  );
}
