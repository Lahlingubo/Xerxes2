import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { createApiClient } from '../services/api';

interface ClosedTrade {
  id: string;
  instrument: string;
  price: string;
  units: string;
  realizedPL: string;
  closeTime: string;
}

export default function TradeHistory() {
  const credentials = useAuthStore((state) => state.credentials);
  const [trades, setTrades] = useState<ClosedTrade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<ClosedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (credentials) {
      fetchTradeHistory();
      const interval = setInterval(fetchTradeHistory, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [credentials]);

  useEffect(() => {
    filterTrades();
  }, [trades, dateRange]);

  const fetchTradeHistory = async () => {
    if (!credentials) return;

    try {
      setIsLoading(true);
      const api = createApiClient(credentials.apiKey, credentials.environment);
      const response = await api.getTradeHistory(credentials.accountId);
      
      // Sort trades by close time (newest first)
      const sortedTrades = response.trades.sort((a, b) => 
        new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime()
      );
      
      setTrades(sortedTrades);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch trade history:', err);
      setError('Failed to fetch trade history');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTrades = () => {
    let filtered = [...trades];

    if (dateRange.startDate) {
      filtered = filtered.filter(trade => 
        new Date(trade.closeTime) >= new Date(dateRange.startDate)
      );
    }

    if (dateRange.endDate) {
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      filtered = filtered.filter(trade => 
        new Date(trade.closeTime) <= endDate
      );
    }

    setFilteredTrades(filtered);
  };

  const calculateSummary = () => {
    const summary = filteredTrades.reduce((acc, trade) => {
      const pl = Number(trade.realizedPL);
      return {
        totalPL: acc.totalPL + pl,
        winCount: pl > 0 ? acc.winCount + 1 : acc.winCount,
        lossCount: pl < 0 ? acc.lossCount + 1 : acc.lossCount,
        totalTrades: acc.totalTrades + 1
      };
    }, {
      totalPL: 0,
      winCount: 0,
      lossCount: 0,
      totalTrades: 0
    });

    return {
      ...summary,
      winRate: summary.totalTrades > 0 
        ? ((summary.winCount / summary.totalTrades) * 100).toFixed(1)
        : '0.0'
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">{error}</h3>
          </div>
        </div>
      </div>
    );
  }

  const summary = calculateSummary();

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Trade History</h3>
          
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Total P/L</p>
              <p className={`mt-2 text-xl font-semibold ${summary.totalPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${summary.totalPL.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Win Rate</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {summary.winRate}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Winning Trades</p>
              <p className="mt-2 text-xl font-semibold text-green-600">
                {summary.winCount}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Losing Trades</p>
              <p className="mt-2 text-xl font-semibold text-red-600">
                {summary.lossCount}
              </p>
            </div>
          </div>
        </div>
        
        {filteredTrades.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No trade history to display
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instrument
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Close Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P/L
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(trade.closeTime), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.instrument}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          Number(trade.units) > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {Number(trade.units) > 0 ? 'LONG' : 'SHORT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.abs(Number(trade.units)).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Number(trade.price).toFixed(5)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={Number(trade.realizedPL) >= 0 ? 'text-green-600' : 'text-red-600'}
                      >
                        ${Number(trade.realizedPL).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}