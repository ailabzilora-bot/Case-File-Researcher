/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import CaseWorkspace from '@/pages/CaseWorkspace';
import DigitalLibrary from '@/pages/DigitalLibrary';
import LibraryAssistant from '@/pages/LibraryAssistant';
import Layout from '@/components/Layout';
import { LibraryProvider } from '@/hooks/useLibrary';

export default function App() {
  return (
    <Router>
      <LibraryProvider>
        <Routes>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/case/:id" element={<CaseWorkspace />} />
          <Route path="/library" element={<Layout><DigitalLibrary /></Layout>} />
          <Route path="/assistant" element={<Layout><LibraryAssistant /></Layout>} />
        </Routes>
      </LibraryProvider>
    </Router>
  );
}
