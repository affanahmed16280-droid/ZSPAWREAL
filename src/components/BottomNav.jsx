import React from 'react';
import { HiHome, HiPlus, HiChartBar, HiClipboardList, HiCurrencyDollar } from 'react-icons/hi';

const tabs = [
  { key: 'dashboard', label: 'Home', icon: HiHome },
  { key: 'history', label: 'History', icon: HiClipboardList },
  { key: 'newOrder', label: 'New Order', icon: HiPlus, isCenter: true },
  { key: 'reports', label: 'Reports', icon: HiChartBar },
  { key: 'expenses', label: 'Expenses', icon: HiCurrencyDollar },
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 safe-bottom bg-surface-950/90 backdrop-blur-2xl border-t border-accent-gold/10 z-40">
      <div className="flex items-end justify-around px-1 pt-2 pb-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex flex-col items-center justify-center -mt-5 group"
                aria-label={tab.label}
              >
                <div
                  className={`
                    w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-black/50
                    bg-gradient-to-r from-brand-600 to-brand-400 border border-brand-300/30
                    transition-all duration-200 active:scale-90
                    ${isActive ? 'ring-2 ring-accent-gold/50 scale-105' : 'hover:scale-105'}
                  `}
                >
                  <Icon className="text-2xl text-white" />
                </div>
                <span className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${isActive ? 'text-accent-gold' : 'text-white/40'}`}>
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex flex-col items-center justify-center min-w-[48px] min-h-[44px] py-1 group transition-all duration-200 active:scale-95"
              aria-label={tab.label}
            >
              <Icon className={`text-xl transition-colors duration-200 ${isActive ? 'text-accent-gold' : 'text-white/40 group-hover:text-accent-champagne'}`} />
              <span className={`text-[9px] mt-1 font-medium transition-colors duration-200 ${isActive ? 'text-accent-gold' : 'text-white/40'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-accent-gold mt-0.5 animate-fade-in shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
