import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './layouts/Layout';
import Dashboard from './pages/Dashboard';
import Segments from './pages/Segments';
import Campaigns from './pages/Campaigns';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="segments" element={<Segments />} />
          <Route path="campaigns" element={<Campaigns />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
