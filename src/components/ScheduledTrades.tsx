import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface ScheduledTrade {
  id: string;
  scheduledTime: string;
  trades: any[];
  timeoutId: number;
}

export default function ScheduledTrades() {
  const [scheduledTrades, setScheduledTrades] = useState<ScheduledTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadScheduledTrades();
    const interval = setInterval(loadScheduledTrades, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadScheduledTrades = () => {
    const trades: ScheduledTrade[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('batch_trades_') || key?.startsWith('scheduled_trade_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          trades.push({
            id: key,
            ...data
          });
        } catch (err) {
          console.error('Failed to parse scheduled trade:', err);
        }
      }
    }
    setScheduledTrades(trades.sort((a, b) => 
      new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    ));
  };

  const cancelTrade = (trade: ScheduledTrade) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this scheduled trade?');
    if (!confirmCancel) return;

    try {
      clearTimeout(trade.timeoutId);
      localStorage.removeItem(trade.id);
      setScheduledTrades(prev => prev.filter(t => t.id !== trade.id));
      setSuccess('Trade cancelled successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to cancel trade:', err);
      setError('Failed to cancel trade');
      setTimeout(() => setError(null), 3000);
    }
  };

  const formatLocalTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy HH:mm:ss');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Scheduled Trades</h3>
        </div>

        {(error || success) && (
          <div className={`m-6 rounded-md p-4 ${error ? 'bg-red-50' : 'bg-green-50'}`}>
            <div className="flex">
              {error ? (
                <AlertCircle className="h-5 w-5 text-red-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-400" />
              )}
              <div className="ml-3">
                <p className={`text-sm font-medium ${error ? 'text-red-800' : 'text-green-800'}`}>
                  {error || success}
                </p>
              </div>
            </div>
          </div>
        )}

        {scheduledTrades.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No scheduled trades
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trade Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scheduledTrades.map((trade) => {
                  const scheduledTime = new Date(trade.scheduledTime);
                  const now = new Date();
                  const isPending = scheduledTime > now;

                  return (
                    <tr key={trade.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          {formatLocalTime(trade.scheduledTime)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="space-y-2">
                          {Array.isArray(trade.trades) ? (
                            trade.trades.map((t, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  t.direction === 'LONG'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {t.direction}
                                </span>
                                <span>{t.instrument}</span>
                                <span className="text-gray-500">
                                  Risk: ${t.riskAmount}
                                </span>
                                <span className="text-gray-500">
                                  SL: {t.stopLoss} pips
                                </span>
                                <span className="text-gray-500">
                                  TP: {t.takeProfit} pips
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                trade.trades.direction === 'LONG'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {trade.trades.direction}
                              </span>
                              <span>{trade.trades.instrument}</span>
                              <span className="text-gray-500">
                                Risk: ${trade.trades.riskAmount}
                              </span>
                              <span className="text-gray-500">
                                SL: {trade.trades.stopLoss} pips
                              </span>
                              <span className="text-gray-500">
                                TP: {trade.trades.takeProfit} pips
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isPending ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isPending ? 'Pending' : 'Executed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isPending && (
                          <button
                            onClick={() => cancelTrade(trade)}
                            className="inline-flex items-center text-red-600 hover:text-red-900"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}