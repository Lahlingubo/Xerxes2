import React, { useState, useEffect } from 'react';
import { Save, Upload, Download, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTemplateStore } from '../store/templateStore';
import { createApiClient } from '../services/api';

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

interface BatchTrade {
  id: string;
  direction: 'LONG' | 'SHORT';
  instrument: string;
  riskAmount: number;
  stopLoss: number;
  takeProfit: number;
  moveToBreakEven: boolean;
  breakEvenPips: number;
  notes: string;
}

interface TradeFormProps {
  trade: BatchTrade;
  onChange: (trade: BatchTrade) => void;
  onDelete: () => void;
  direction: 'LONG' | 'SHORT';
  currentPrice: { bid: string; ask: string } | null;
}

function TradeForm({ trade, onChange, onDelete, direction, currentPrice }: TradeFormProps) {
  const [calculatedUnits, setCalculatedUnits] = useState<number | null>(null);

  useEffect(() => {
    if (currentPrice) {
      calculatePositionSize();
    }
  }, [currentPrice, trade.direction, trade.riskAmount, trade.stopLoss]);

  const calculatePositionSize = () => {
    if (!currentPrice) return;

    try {
      const isLong = direction === 'LONG';
      const entryPrice = isLong ? currentPrice.ask : currentPrice.bid;
      const pipValue = 0.0001; // For most pairs except JPY
      
      // Calculate spread in pips
      const spread = (Number(currentPrice.ask) - Number(currentPrice.bid)) / pipValue;
      
      // For both long and short positions, add spread to stop loss distance
      const totalStopDistance = trade.stopLoss + spread;
      
      // Adjust risk per pip to account for spread
      const adjustedRiskPerPip = trade.riskAmount / totalStopDistance;
      
      // For a currency pair like EUR/USD:
      // 1 pip = 0.0001
      // 1 standard lot = 100,000 units
      const pipValuePerStandardLot = 10;
      const standardLots = adjustedRiskPerPip / pipValuePerStandardLot;
      const units = Math.floor(standardLots * 100000);
      
      setCalculatedUnits(units);
    } catch (error) {
      console.error('Failed to calculate position size:', error);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow space-y-4">
      <div className="flex justify-between items-center">
        <h4 className={`font-medium ${direction === 'LONG' ? 'text-green-600' : 'text-red-600'}`}>
          {direction} Position
        </h4>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-gray-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {currentPrice && (
        <div className="p-4 bg-gray-50 rounded-md">
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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Trading Pair</label>
          <select
            value={trade.instrument}
            onChange={(e) => onChange({ ...trade, instrument: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            {TRADING_PAIRS.map((pair) => (
              <option key={pair} value={pair}>{pair}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Risk Amount</label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              value={trade.riskAmount}
              onChange={(e) => onChange({ ...trade, riskAmount: Number(e.target.value) })}
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
            value={trade.stopLoss}
            onChange={(e) => onChange({ ...trade, stopLoss: Number(e.target.value) })}
            className="mt-1 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            min="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Take Profit (pips)</label>
          <input
            type="number"
            value={trade.takeProfit}
            onChange={(e) => onChange({ ...trade, takeProfit: Number(e.target.value) })}
            className="mt-1 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            min="1"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`moveToBreakEven-${trade.id}`}
              checked={trade.moveToBreakEven}
              onChange={(e) => onChange({ ...trade, moveToBreakEven: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor={`moveToBreakEven-${trade.id}`} className="ml-2 block text-sm text-gray-900">
              Move to break-even
            </label>
          </div>

          {trade.moveToBreakEven && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Break-even at (pips)</label>
              <input
                type="number"
                value={trade.breakEvenPips}
                onChange={(e) => onChange({ ...trade, breakEvenPips: Number(e.target.value) })}
                className="mt-1 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                min="1"
              />
            </div>
          )}
        </div>

        {calculatedUnits !== null && (
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Position Details</h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Position size: <span className="font-medium">{calculatedUnits.toLocaleString()} units</span>
              </p>
              <p className="text-sm text-gray-600">
                Risk per pip: <span className="font-medium">${(trade.riskAmount / trade.stopLoss).toFixed(2)}</span>
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            value={trade.notes}
            onChange={(e) => onChange({ ...trade, notes: e.target.value })}
            rows={2}
            className="mt-1 block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

const getDefaultScheduledTime = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  return tomorrow.toISOString().slice(0, 16); // Format for datetime-local input
};

export default function BatchTrading() {
  const credentials = useAuthStore((state) => state.credentials);
  const { templates, addTemplate, deleteTemplate, exportTemplate, importTemplate } = useTemplateStore();
  const [tradeSpaces, setTradeSpaces] = useState(6);
  const [trades, setTrades] = useState<BatchTrade[]>([]);
  const [prices, setPrices] = useState<Record<string, { bid: string; ask: string }>>({});
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(getDefaultScheduledTime());

  useEffect(() => {
    if (isScheduled) {
      setScheduledTime(getDefaultScheduledTime());
    }
  }, [isScheduled]);

  useEffect(() => {
    // Initialize trades array with empty trades
    const initialTrades = Array(tradeSpaces).fill(null).map((_, index) => ({
      id: crypto.randomUUID(),
      direction: index < tradeSpaces / 2 ? 'LONG' : 'SHORT',
      instrument: TRADING_PAIRS[0],
      riskAmount: 1,
      stopLoss: 25,
      takeProfit: 50,
      moveToBreakEven: false,
      breakEvenPips: 15,
      notes: '',
    }));
    setTrades(initialTrades);
  }, [tradeSpaces]);

  useEffect(() => {
    if (credentials) {
      fetchPrices();
      const interval = setInterval(fetchPrices, 1000);
      return () => clearInterval(interval);
    }
  }, [credentials, trades]);

  useEffect(() => {
    if (isScheduled) {
      setScheduledTime(getDefaultScheduledTime());
    }
  }, [isScheduled]);

  const fetchPrices = async () => {
    if (!credentials) return;

    try {
      const api = createApiClient(credentials.apiKey, credentials.environment);
      const instruments = [...new Set(trades.map(t => t.instrument))];
      
      if (instruments.length > 0) {
        const response = await api.getCurrentPrices(credentials.accountId, instruments);
        if (response && Array.isArray(response.prices)) {
          const priceMap = response.prices.reduce((acc: any, price: any) => {
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
      }
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    }
  };

  const handleTradeChange = (index: number, updatedTrade: BatchTrade) => {
    setTrades(trades.map((trade, i) => i === index ? updatedTrade : trade));
  };

  const handleDeleteTrade = (index: number) => {
    setTrades(trades.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = () => {
    if (!templateName) {
      setError('Please enter a template name');
      return;
    }
    addTemplate({
      name: templateName,
      trades,
    });
    setTemplateName('');
    setSuccess('Template saved successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setTrades(template.trades);
      setTradeSpaces(template.trades.length);
      setSelectedTemplate('');
      setSuccess('Template loaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (importTemplate(content)) {
          setSuccess('Template imported successfully');
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError('Invalid template file');
          setTimeout(() => setError(null), 3000);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExportTemplate = (templateId: string) => {
    const content = exportTemplate(templateId);
    if (content) {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trade-template.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const validateTrades = () => {
    for (const trade of trades) {
      if (!trade.instrument || trade.riskAmount <= 0 || trade.stopLoss <= 0 || trade.takeProfit <= 0) {
        return false;
      }
    }
    if (isScheduled && !scheduledTime) {
      return false;
    }
    return true;
  };

  const showConfirmationDialog = (trades: BatchTrade[], isScheduled: boolean, scheduledTime?: string) => {
    const message = `Are you sure you want to execute the following trades?

${trades.map(trade => `
${trade.direction} ${trade.instrument}
Risk Amount: $${trade.riskAmount}
Stop Loss: ${trade.stopLoss} pips
Take Profit: ${trade.takeProfit} pips
${trade.moveToBreakEven ? `Move to Break-even at +${trade.breakEvenPips} pips` : ''}
`).join('\n')}
${isScheduled ? `Scheduled for: ${new Date(scheduledTime!).toLocaleString()}` : ''}`;

    return window.confirm(message);
  };

  const handleExecuteTrades = async () => {
    if (!credentials || !validateTrades()) {
      setError('Please fill in all required fields for each trade');
      return;
    }

    if (!showConfirmationDialog(trades, isScheduled, scheduledTime)) {
      return;
    }

    setIsExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const api = createApiClient(credentials.apiKey, credentials.environment);

      const executeTrades = async () => {
        const results = await Promise.allSettled(
          trades.map(async trade => {
            const currentPrice = prices[trade.instrument];
            if (!currentPrice) throw new Error(`No price data for ${trade.instrument}`);

            const isLong = trade.direction === 'LONG';
            const entryPrice = isLong ? currentPrice.ask : currentPrice.bid;
            const pipValue = 0.0001;

            // Calculate position size based on risk
            const riskPerPip = trade.riskAmount / trade.stopLoss;
            const pipValuePerStandardLot = 10;
            const standardLots = riskPerPip / pipValuePerStandardLot;
            const units = Math.floor(standardLots * 100000);
            
            const finalUnits = isLong ? units : -units;

            const stopLossPrice = (isLong 
              ? Number(entryPrice) - (trade.stopLoss * pipValue)
              : Number(entryPrice) + (trade.stopLoss * pipValue)).toFixed(5);

            const takeProfitPrice = (isLong
              ? Number(entryPrice) + (trade.takeProfit * pipValue)
              : Number(entryPrice) - (trade.takeProfit * pipValue)).toFixed(5);

            const response = await api.createOrder(credentials.accountId, {
              type: 'MARKET',
              instrument: trade.instrument,
              units: finalUnits,
              stopLossOnFill: {
                price: stopLossPrice,
                timeInForce: 'GTC'
              },
              takeProfitOnFill: {
                price: takeProfitPrice,
                timeInForce: 'GTC'
              }
            });

            if (trade.moveToBreakEven && response.orderFillTransaction) {
              const tradeId = response.orderFillTransaction.tradeOpened.tradeID;
              const breakEvenPrice = entryPrice;

              const breakEvenInterval = setInterval(async () => {
                try {
                  const currentPrices = await api.getCurrentPrices(credentials.accountId, [trade.instrument]);
                  if (!currentPrices || !currentPrices.prices || !currentPrices.prices[0]) return;

                  const currentPrice = isLong ? currentPrices.prices[0].bids[0].price : currentPrices.prices[0].asks[0].price;
                  const profitPips = isLong 
                    ? (Number(currentPrice) - Number(entryPrice)) / pipValue
                    : (Number(entryPrice) - Number(currentPrice)) / pipValue;

                  if (profitPips >= trade.breakEvenPips) {
                    await api.modifyTrade(credentials.accountId, tradeId, breakEvenPrice);
                    clearInterval(breakEvenInterval);
                  }
                } catch (err) {
                  console.error('Failed to update break-even:', err);
                  clearInterval(breakEvenInterval);
                }
              }, 1000);
            }

            return response;
          })
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (failed === 0) {
          setSuccess(`Successfully executed ${successful} trades`);
        } else {
          setError(`${successful} trades executed successfully, ${failed} trades failed`);
        }
      };

      if (isScheduled) {
        const scheduledTimeMs = new Date(scheduledTime).getTime();
        const now = new Date().getTime();
        
        if (scheduledTimeMs <= now) {
          setError('Scheduled time must be in the future');
          setIsExecuting(false);
          return;
        }

        const timeoutId = setTimeout(async () => {
          try {
            await executeTrades();
          } catch (err) {
            console.error('Failed to execute scheduled trades:', err);
            setError('Failed to execute scheduled trades');
          }
        }, scheduledTimeMs - now);

        localStorage.setItem(`batch_trades_${Date.now()}`, JSON.stringify({
          timeoutId,
          scheduledTime,
          trades
        }));

        setSuccess(`Trades scheduled for execution at ${new Date(scheduledTimeMs).toLocaleString()}`);
      } else {
        await executeTrades();
      }
    } catch (err) {
      console.error('Failed to execute trades:', err);
      setError('Failed to execute trades');
    } finally {
      setIsExecuting(false);
    }
  };

  const longTrades = trades.filter(t => t.direction === 'LONG');
  const shortTrades = trades.filter(t => t.direction === 'SHORT');

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Batch Trading</h2>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Trade Spaces</label>
              <select
                value={tradeSpaces}
                onChange={(e) => setTradeSpaces(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className={`mb-6 rounded-md p-4 ${error ? 'bg-red-50' : 'bg-green-50'}`}>
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

        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="scheduled"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="scheduled" className="ml-2 flex items-center text-sm text-gray-900">
                <Clock className="h-4 w-4 mr-1" />
                Schedule All Trades
              </label>
            </div>

            {isScheduled && (
              <div className="flex-1">
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-lg font-medium text-green-600 mb-4">Long Positions</h3>
            <div className="space-y-4">
              {longTrades.map((trade, index) => (
                <TradeForm
                  key={trade.id}
                  trade={trade}
                  onChange={(updatedTrade) => handleTradeChange(index, updatedTrade)}
                  onDelete={() => handleDeleteTrade(index)}
                  direction="LONG"
                  currentPrice={prices[trade.instrument] || null}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-red-600 mb-4">Short Positions</h3>
            <div className="space-y-4">
              {shortTrades.map((trade, index) => (
                <TradeForm
                  key={trade.id}
                  trade={trade}
                  onChange={(updatedTrade) => handleTradeChange(index + longTrades.length, updatedTrade)}
                  onDelete={() => handleDeleteTrade(index + longTrades.length)}
                  direction="SHORT"
                  currentPrice={prices[trade.instrument] || null}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Template Name</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="flex-1 min-w-0 block w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter template name"
                  />
                  <button
                    onClick={handleSaveTemplate}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Load Template</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleLoadTemplate(e.target.value)}
                    className="flex-1 min-w-0 block w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select a template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Import/Export</label>
                <div className="mt-1 flex space-x-3">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportTemplate}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Template
                    </div>
                  </label>
                  
                  {templates.length > 0 && (
                    <button
                      onClick={() => selectedTemplate && handleExportTemplate(selectedTemplate)}
                      disabled={!selectedTemplate}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Template
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleExecuteTrades}
            disabled={isExecuting || !validateTrades()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isExecuting ? 'Executing Trades...' : isScheduled ? 'Schedule Trades' : 'Execute All Trades'}
          </button>
        </div>
      </div>
    </div>
  );
}