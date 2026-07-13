import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import Reports from './components/Reports';
import OrderHistory from './components/OrderHistory';
import Expenses from './components/Expenses';
import Login from './components/Login';

const TABS = {
  dashboard: Dashboard,
  newOrder: OrderForm,
  reports: Reports,
  history: OrderHistory,
  expenses: Expenses,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const auth = localStorage.getItem('zs_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('zs_auth', 'true');
  };

  const ActiveComponent = TABS[activeTab] || Dashboard;

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout>
      <ActiveComponent setActiveTab={setActiveTab} />
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </Layout>
  );
}
