import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { createApiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface ActiveTrade {
  id: string;
  instrument: string;
  currentUnits: string;
  price: string;
  unrealizedPL: string;
  stopLossOrder?: {
    price: string;
  };
  takeProfitOrder?: {
    price: string;
  };
}

export default function ActiveTrades() {
  const credentials = useAuthStore((state) => state.credentials);
  const [trades, setTrades] = useState<ActiveTrade[]>([]);
  const [prices, setPrices] = useState<Record<string, { bid: string; ask: string }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (credentials) {
      fetchActiveTrades();
      const interval = setInterval(fetchActiveTrades, 5000);
      return () => clearInterval(interval);
    }
  }, [credentials]);

  const fetchActiveTrades = async () => {
    if (!credentials) return;

    try {
      const api = createApiClient(credentials.apiKey, credentials.environment);
      const response = await api.getOpenTrades(credentials.accountId);
      
      if (!response || !Array.isArray(response.trades)) {
        console.error('Invalid response format:', response);
        setError('Invalid response from server');
        setTrades([]);
        return;
      }

      // Get current prices for all instruments
      const instruments = response.trades.map((t: ActiveTrade) => t.instrument);
      const uniqueInstruments = [...new Set(instruments)];
      
      if (uniqueInstruments.length > 0) {
        try {
          const pricesResponse = await api.getCurrentPrices(credentials.accountId, uniqueInstruments);
          
          if (pricesResponse && Array.isArray(pricesResponse.prices)) {
            const priceMap = pricesResponse.prices.reduce((acc: any, price: any) => {
              if (price.bids?.[0]?.price && price.asks?.[0]?.price) {
                acc[price.instrument] = {
                  bid: price.bids[0].price,
                  ask: price.asks[0].price
                };
              }
              return acc;
            }, {});
            
            setPrices(priceMap);
          }
        } catch (priceErr) {
          console.error('Failed to fetch prices:', priceErr);
          // Don't fail the whole component if just prices fail
        }
      }
      
      setTrades(response.trades);
      setIsLoading(false);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch active trades:', err);
      let errorMessage = 'Failed to fetch active trades';
      if (err.response?.data?.errorMessage) {
        errorMessage = err.response.data.errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setTrades([]);
      setIsLoading(false);
    }
  };

  const handleClosePosition = async (tradeId: string) => {
    if (!credentials) return;

    try {
      const api = createApiClient(credentials.apiKey, credentials.environment);
      await api.closeTrade(credentials.accountId, tradeId);
      await fetchActiveTrades(); // Refresh the trades list
      setSuccessMessage('Trade closed successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to close position:', err);
      let errorMessage = 'Failed to close position';
      if (err.response?.data?.errorMessage) {
        errorMessage = err.response.data.errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateBreakEven = async (tradeId: string, trade: ActiveTrade) => {
    if (!credentials) return;

    try {
      const api = createApiClient(credentials.apiKey, credentials.environment);
      const currentPrice = prices[trade.instrument];
      if (!currentPrice) throw new Error('No price data available');

      const isLong = Number(trade.currentUnits) > 0;
      const entryPrice = Number(trade.price);
      const pipValue = 0.0001; // One pip for currency pairs like EUR/USD
      
      // Calculate break-even price based on position direction
      // For long positions, we want to set stop loss at entry price
      // For short positions, we want to set stop loss at entry price
      const breakEvenPrice = entryPrice.toFixed(5);

      await api.modifyTrade(credentials.accountId, tradeId, breakEvenPrice);
      await fetchActiveTrades(); // Refresh the trades list
      setSuccessMessage('Break-even level updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to update break-even level:', err);
      let errorMessage = 'Failed to update break-even level';
      if (err.response?.data?.errorMessage) {
        errorMessage = err.response.data.errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(error || successMessage) && (
        <div className={`rounded-md p-4 ${error ? 'bg-red-50' : 'bg-green-50'}`}>
          <div className="flex">
            {error ? (
              <AlertCircle className="h-5 w-5 text-red-400" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-400" />
            )}
            <div className="ml-3">
              <p className={`text-sm font-medium ${error ? 'text-red-800' : 'text-green-800'}`}>
                {error || successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Trades</h3>
        </div>
        
        {trades.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No active trades
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    Entry Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stop Loss
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Take Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P/L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.map((trade) => {
                  const currentPrice = prices[trade.instrument];
                  const isLong = Number(trade.currentUnits) > 0;
                  
                  return (
                    <tr key={trade.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {trade.instrument}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isLong
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Math.abs(Number(trade.currentUnits)).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(trade.price).toFixed(5)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {currentPrice ? Number(isLong ? currentPrice.bid : currentPrice.ask).toFixed(5) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trade.stopLossOrder ? Number(trade.stopLossOrder.price).toFixed(5) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trade.takeProfitOrder ? Number(trade.takeProfitOrder.price).toFixed(5) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={Number(trade.unrealizedPL) >= 0 ? 'text-green-600' : 'text-red-600'}
                        >
                          ${Number(trade.unrealizedPL).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        <button
                          onClick={() => handleUpdateBreakEven(trade.id, trade)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Break-even
                        </button>
                        <button
                          onClick={() => handleClosePosition(trade.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Close
                        </button>
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