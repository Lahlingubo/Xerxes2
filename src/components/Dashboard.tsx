import React from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LineChart, ArrowRightLeft, Activity, LogOut, Layers, Calendar, Clock, Sun, Moon } from 'lucide-react';
import AccountOverview from './AccountOverview';
import TradeEntry from './TradeEntry';
import ActiveTrades from './ActiveTrades';
import TradeHistory from './TradeHistory';
import BatchTrading from './BatchTrading';
import EconomicCalendar from './EconomicCalendar';
import ScheduledTrades from './ScheduledTrades';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const clearCredentials = useAuthStore((state) => state.clearCredentials);
  const { isDark, toggleTheme } = useThemeStore();

  const handleLogout = () => {
    clearCredentials();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex space-x-8">
                <NavLink
                  to=""
                  end
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-indigo-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    }`
                  }
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Overview
                </NavLink>
                <NavLink
                  to="active"
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-indigo-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    }`
                  }
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Active Trades
                </NavLink>
                <NavLink
                  to="history"
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-indigo-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    }`
                  }
                >
                  <LineChart className="w-4 h-4 mr-2" />
                  History
                </NavLink>
                <NavLink
                  to="trade"
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-indigo-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    }`
                  }
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Trade
                </NavLink>
                <NavLink
                  to="batch"
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-indigo-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    }`
                  }
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Batch Trading
                </NavLink>
                <NavLink
                  to="scheduled"
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-indigo-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    }`
                  }
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Scheduled
                </NavLink>
                <NavLink
                  to="calendar"
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-indigo-500 text-gray-900 dark:text-white'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                    }`
                  }
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Calendar
                </NavLink>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="" element={<AccountOverview />} />
          <Route path="active" element={<ActiveTrades />} />
          <Route path="history" element={<TradeHistory />} />
          <Route path="trade" element={<TradeEntry />} />
          <Route path="batch" element={<BatchTrading />} />
          <Route path="scheduled" element={<ScheduledTrades />} />
          <Route path="calendar" element={<EconomicCalendar />} />
        </Routes>
      </main>
    </div>
  );
}