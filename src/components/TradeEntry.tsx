import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { createApiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface TradeForm {
  instrument: string;
  direction: 'LONG' | 'SHORT';
  riskAmount: number;
  stopLoss: number;
  takeProfit: number;
  moveToBreakEven: boolean;
  breakEvenPips: number;
  scheduled: boolean;
  scheduledTime: string;
}

const TRADING_PAIRS = [
  'EUR_USD',
  'GBP_USD',
  'USD_JPY',
  'USD_CAD',
  'AUD_USD',
  'NZD_USD',
  'USD_CHF',
  'EUR_GBP',
];

const getDefaultScheduledTime = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16); // Format for datetime-local input
};

export default function TradeEntry() {
  const credentials = useAuthStore((state) => state.credentials);
  const [form, setForm] = useState<TradeForm>({
    instrument: TRADING_PAIRS[0],
    direction: 'LONG',
    riskAmount: 1,
    stopLoss: 25,
    takeProfit: 50,
    moveToBreakEven: false,
    breakEvenPips: 15,
    scheduled: false,
    scheduledTime: getDefaultScheduledTime()
  });
  const [currentPrice, setCurrentPrice] = useState<{ bid: string; ask: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedUnits, setCalculatedUnits] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (credentials) {
      fetchCurrentPrice();
      const interval = setInterval(fetchCurrentPrice, 1000);
      return () => clearInterval(interval);
    }
  }, [credentials, form.instrument]);

  useEffect(() => {
    if (currentPrice) {
      calculatePositionSize();
    }
  }, [currentPrice, form.direction, form.riskAmount, form.stopLoss]);

  // When scheduled checkbox is toggled, update the time
  useEffect(() => {
    if (form.scheduled) {
      setForm(prev => ({
        ...prev,
        scheduledTime: getDefaultScheduledTime()
      }));
    }
  }, [form.scheduled]);

  const fetchCurrentPrice = async () => {
    if (!credentials) return;

    try {
      const api = createApiClient(credentials.apiKey, credentials.environment);
      const response = await api.getCurrentPrices(credentials.accountId, [form.instrument]);
      if (response && response.prices && response.prices[0]) {
        setCurrentPrice({
          bid: response.prices[0].bids[0].price,
          ask: response.prices[0].asks[0].price
        });
      }
    } catch (err) {
      console.error('Failed to fetch price:', err);
    }
  };

  const calculatePositionSize = () => {
    if (!currentPrice) return;

    try {
      const isLong = form.direction === 'LONG';
      const entryPrice = isLong ? currentPrice.ask : currentPrice.bid;
      const pipValue = 0.0001; // For most pairs except JPY
      
      // Calculate spread in pips
      const spread = (Number(currentPrice.ask) - Number(currentPrice.bid)) / pipValue;
      
      // For long positions, add spread to stop loss distance
      // For short positions, add spread to stop loss distance
      const totalStopDistance = form.stopLoss + spread;
      
      // Adjust risk per pip to account for spread
      const adjustedRiskPerPip = form.riskAmount / totalStopDistance;
      
      // For a currency pair like EUR/USD:
      // 1 pip = 0.0001
      // 1 standard lot = 100,000 units
      // To calculate units: (risk per pip) / (pip value in quote currency)
      const pipValuePerStandardLot = 10;
      const standardLots = adjustedRiskPerPip / pipValuePerStandardLot;
      const units = Math.floor(standardLots * 100000);
      
      setCalculatedUnits(units);
    } catch (error) {
      console.error('Failed to calculate position size:', error);
    }
  };

  const showConfirmationDialog = (trade: any) => {
    const message = `Are you sure you want to execute the following trade?

${trade.direction} ${trade.instrument}
Risk Amount: $${trade.riskAmount}
Stop Loss: ${trade.stopLoss} pips
Take Profit: ${trade.takeProfit} pips
${trade.moveToBreakEven ? `Move to Break-even at +${trade.breakEvenPips} pips` : ''}
${trade.scheduled ? `Scheduled for: ${new Date(trade.scheduledTime).toLocaleString()}` : ''}`;

    return window.confirm(message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials || !currentPrice || !calculatedUnits) return;

    if (!showConfirmationDialog(form)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const api = createApiClient(credentials.apiKey, credentials.environment);
      const isLong = form.direction === 'LONG';
      const units = isLong ? calculatedUnits : -calculatedUnits;
      const entryPrice = isLong ? currentPrice.ask : currentPrice.bid;
      const pipValue = 0.0001;

      const stopLossPrice = (isLong 
        ? Number(entryPrice) - (form.stopLoss * pipValue)
        : Number(entryPrice) + (form.stopLoss * pipValue)).toFixed(5);

      const takeProfitPrice = (isLong
        ? Number(entryPrice) + (form.takeProfit * pipValue)
        : Number(entryPrice) - (form.takeProfit * pipValue)).toFixed(5);

      const orderPayload = {
        type: 'MARKET',
        instrument: form.instrument,
        units: units,
        stopLossOnFill: {
          price: stopLossPrice,
          timeInForce: 'GTC'
        },
        takeProfitOnFill: {
          price: takeProfitPrice,
          timeInForce: 'GTC'
        }
      };

      if (form.scheduled) {
        const scheduledTime = new Date(form.scheduledTime).getTime();
        const now = new Date().getTime();
        
        if (scheduledTime <= now) {
          setError('Scheduled time must be in the future');
          setIsSubmitting(false);
          return;
        }

        // Schedule the trade execution
        const timeoutId = setTimeout(async () => {
          try {
            const response = await api.createOrder(credentials.accountId, orderPayload);
            console.log('Scheduled trade executed:', response);
          } catch (err) {
            console.error('Failed to execute scheduled trade:', err);
          }
        }, scheduledTime - now);

        setSuccessMessage(`Trade scheduled for ${new Date(scheduledTime).toLocaleString()}`);
        
        // Store the timeout ID to potentially cancel it later
        localStorage.setItem(`scheduled_trade_${Date.now()}`, JSON.stringify({
          timeoutId,
          scheduledTime,
          trade: {
            ...form,
            units: calculatedUnits
          }
        }));
      } else {
        const response = await api.createOrder(credentials.accountId, orderPayload);

        // Handle break-even if enabled
        if (form.moveToBreakEven && response.orderFillTransaction) {
          const tradeId = response.orderFillTransaction.tradeOpened.tradeID;
          const breakEvenPrice = entryPrice;

          // Monitor price and move to break-even when profit target is reached
          const breakEvenInterval = setInterval(async () => {
            try {
              const currentPrices = await api.getCurrentPrices(credentials.accountId, [form.instrument]);
              if (!currentPrices || !currentPrices.prices || !currentPrices.prices[0]) return;

              const currentPrice = isLong ? currentPrices.prices[0].bids[0].price : currentPrices.prices[0].asks[0].price;
              const profitPips = isLong 
                ? (Number(currentPrice) - Number(entryPrice)) / pipValue
                : (Number(entryPrice) - Number(currentPrice)) / pipValue;

              if (profitPips >= form.breakEvenPips) {
                await api.modifyTrade(credentials.accountId, tradeId, breakEvenPrice);
                clearInterval(breakEvenInterval);
              }
            } catch (err) {
              console.error('Failed to update break-even:', err);
              clearInterval(breakEvenInterval);
            }
          }, 1000);
        }

        setSuccessMessage(`Trade placed successfully:
          ${form.direction} ${Math.abs(units).toLocaleString()} units of ${form.instrument}
          Entry: ${Number(entryPrice).toFixed(5)}
          SL: ${stopLossPrice}
          TP: ${takeProfitPrice}
          ${form.moveToBreakEven ? `Break-even at +${form.breakEvenPips} pips` : ''}`);
      }

      // Reset form after successful trade
      setForm({
        instrument: TRADING_PAIRS[0],
        direction: 'LONG',
        riskAmount: 1,
        stopLoss: 25,
        takeProfit: 50,
        moveToBreakEven: false,
        breakEvenPips: 15,
        scheduled: false,
        scheduledTime: getDefaultScheduledTime()
      });
      setCalculatedUnits(null);

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      let errorMessage = 'Failed to place trade';
      if (err.response?.data?.errorMessage) {
        errorMessage = err.response.data.errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);

      // Clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">New Trade Entry</h2>
      
      {(error || successMessage) && (
        <div className={`mb-6 rounded-md p-4 ${error ? 'bg-red-50' : 'bg-green-50'}`}>
          <div className="flex">
            {error ? (
              <AlertCircle className="h-5 w-5 text-red-400" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-400" />
            )}
            <div className="ml-3">
              <p className={`text-sm font-medium ${error ? 'text-red-800' : 'text-green-800'}`}>
                {error || successMessage.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </p>
            </div>
          </div>
        </div>
      )}

      {currentPrice && (
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Bid</p>
              <p className="text-lg font-medium">{Number(currentPrice.bid).toFixed(5)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ask</p>
              <p className="text-lg font-medium">{Number(currentPrice.ask).toFixed(5)}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Trading Pair</label>
          <select
            value={form.instrument}
            onChange={(e) => setForm({ ...form, instrument: e.target.value })}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
          >
            {TRADING_PAIRS.map((pair) => (
              <option key={pair} value={pair}>{pair}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Direction</label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setForm({ ...form, direction: 'LONG' })}
              className={`flex-1 inline-flex items-center justify-center px-4 py-2 border rounded-md ${
                form.direction === 'LONG'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              <ArrowUpCircle className="mr-2 h-5 w-5" />
              Long
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, direction: 'SHORT' })}
              className={`flex-1 inline-flex items-center justify-center px-4 py-2 border rounded-md ${
                form.direction === 'SHORT'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              <ArrowDownCircle className="mr-2 h-5 w-5" />
              Short
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Risk Amount</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                value={form.riskAmount}
                onChange={(e) => setForm({ ...form, riskAmount: Number(e.target.value) })}
                className="block w-full pr-12 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">USD</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Stop Loss (pips)</label>
            <input
              type="number"
              value={form.stopLoss}
              onChange={(e) => setForm({ ...form, stopLoss: Number(e.target.value) })}
              className="mt-1 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Take Profit (pips)</label>
            <input
              type="number"
              value={form.takeProfit}
              onChange={(e) => setForm({ ...form, takeProfit: Number(e.target.value) })}
              className="mt-1 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              min="1"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="moveToBreakEven"
              checked={form.moveToBreakEven}
              onChange={(e) => setForm({ ...form, moveToBreakEven: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="moveToBreakEven" className="ml-2 block text-sm text-gray-900">
              Move to break-even
            </label>
          </div>

          {form.moveToBreakEven && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Break-even at (pips)</label>
              <input
                type="number"
                value={form.breakEvenPips}
                onChange={(e) => setForm({ ...form, breakEvenPips: Number(e.target.value) })}
                className="mt-1 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                min="1"
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="scheduled"
              checked={form.scheduled}
              onChange={(e) => setForm({ ...form, scheduled: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="scheduled" className="ml-2 flex items-center text-sm text-gray-900">
              <Clock className="h-4 w-4 mr-1" />
              Schedule Trade
            </label>
          </div>

          {form.scheduled && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Execution Time</label>
              <input
                type="datetime-local"
                value={form.scheduledTime}
                onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
                className="mt-1 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {calculatedUnits !== null && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Position Details</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Position size: <span className="font-medium">{calculatedUnits.toLocaleString()} units</span>
                </p>
                <p className="text-sm text-gray-600">
                  Risk per pip: <span className="font-medium">${(form.riskAmount / form.stopLoss).toFixed(2)}</span>
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!calculatedUnits || isSubmitting}
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Placing Trade...' : 'Place Trade'}
          </button>
        </div>
      </form>
    </div>
  );
}