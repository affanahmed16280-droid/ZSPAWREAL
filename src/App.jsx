import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import Layout from './components/Layout';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import Reports from './components/Reports';
import OrderHistory from './components/OrderHistory';
import Expenses from './components/Expenses';
import CustomerList from './components/CustomerList';
import Login from './components/Login';

const TABS = {
  dashboard: Dashboard,
  newOrder: OrderForm,
  customers: CustomerList,
  reports: Reports,
  history: OrderHistory,
  expenses: Expenses,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Force user to log in on every refresh
    setIsAuthenticated(false);
    setIsInitializing(false);
  }, []);

  const ActiveComponent = TABS[activeTab] || Dashboard;

  if (isInitializing) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Layout>
      <ActiveComponent setActiveTab={setActiveTab} />
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </Layout>
  );
}
