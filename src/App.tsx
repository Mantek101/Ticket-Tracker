import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TicketDetails from './components/TicketDetails';
import AdminPanel from './components/AdminPanel';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 text-blue-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleViewTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setCurrentPage('ticket-detail');
  };

  const handleBackToDashboard = () => {
    setSelectedTicketId(null);
    setCurrentPage('dashboard');
  };

  const renderPage = () => {
    if (currentPage === 'ticket-detail' && selectedTicketId) {
      return <TicketDetails ticketId={selectedTicketId} onBack={handleBackToDashboard} />;
    }
    if (currentPage === 'admin') {
      return <AdminPanel />;
    }
    return <Dashboard onViewTicket={handleViewTicket} />;
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
