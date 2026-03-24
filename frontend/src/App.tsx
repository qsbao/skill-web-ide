import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { Dashboard } from './pages/Dashboard';
import { IDEPage } from './pages/IDEPage';
import { SkillDetailPage } from './pages/SkillDetailPage';
import { PlaygroundPage } from './pages/PlaygroundPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/skills/:author/:name" element={<SkillDetailPage />} />
          <Route path="/ide/:author/:name" element={<IDEPage />} />
          <Route path="/ide" element={<IDEPage />} />
          <Route path="/playground/:author/:name" element={<PlaygroundPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
