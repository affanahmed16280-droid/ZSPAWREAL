import React, { useState } from 'react';
import Layout from './components/Layout';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import OrderForm from './components/OrderForm';
import Reports from './components/Reports';
import OrderHistory from './components/OrderHistory';
import Expenses from './components/Expenses';

const TABS = {
  dashboard: Dashboard,
  newOrder: OrderForm,
  reports: Reports,
  history: OrderHistory,
  expenses: Expenses,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const ActiveComponent = TABS[activeTab] || Dashboard;

  return (
    <Layout>
      <ActiveComponent setActiveTab={setActiveTab} />
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </Layout>
  );
}
