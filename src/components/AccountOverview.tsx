import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { createApiClient } from '../services/api';

export default function AccountOverview() {
  const credentials = useAuthStore((state) => state.credentials);
  const [accountData, setAccountData] = useState<{
    balance: number;
    unrealizedPL: number;
    realizedPL: number;
    marginAvailable: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (credentials) {
      fetchAccountData();
      const interval = setInterval(fetchAccountData, 1000); // Update every second
      return () => clearInterval(interval);
    }
  }, [credentials]);

  const fetchAccountData = async () => {
    if (!credentials) return;

    try {
      const api = createApiClient(credentials.apiKey, credentials.environment);
      const accountSummary = await api.getAccountSummary(credentials.accountId);
      
      setAccountData({
        balance: Number(accountSummary.balance),
        unrealizedPL: Number(accountSummary.unrealizedPL),
        realizedPL: Number(accountSummary.pl),
        marginAvailable: Number(accountSummary.marginAvailable)
      });
      setError(null);
    } catch (err) {
      setError('Failed to fetch account data');
      console.error('Error fetching account data:', err);
    } finally {
      setIsLoading(false);
    }
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
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">{error}</h3>
          </div>
        </div>
      </div>
    );
  }

  if (!accountData) return null;

  const totalEquity = accountData.balance + accountData.unrealizedPL;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Account Balance</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                ${accountData.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Margin</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                ${accountData.marginAvailable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Profit/Loss Summary</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Total Equity</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Realized P/L</p>
                <p className={`mt-1 text-xl font-semibold ${
                  accountData.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${accountData.realizedPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Unrealized P/L</p>
                <p className={`mt-1 text-xl font-semibold ${
                  accountData.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${accountData.unrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}