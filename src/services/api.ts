import axios from 'axios';

export const OANDA_ENVIRONMENTS = {
  practice: 'https://api-fxpractice.oanda.com/v3',
  live: 'https://api-fxtrade.oanda.com/v3'
} as const;

export type OandaEnvironment = keyof typeof OANDA_ENVIRONMENTS;

export interface OandaPosition {
  instrument: string;
  long: {
    units: string;
    averagePrice: string;
  };
  short: {
    units: string;
    averagePrice: string;
  };
  pl: string;
  unrealizedPL: string;
}

export interface OandaPrice {
  instrument: string;
  time: string;
  bids: Array<{ price: string }>;
  asks: Array<{ price: string }>;
}

export interface OandaTrade {
  id: string;
  instrument: string;
  price: string;
  currentUnits: string;
  unrealizedPL: string;
  stopLossOrder?: {
    price: string;
  };
  takeProfitOrder?: {
    price: string;
  };
}

export interface OandaOrder {
  id: string;
  instrument: string;
  units: string;
  price: string;
  type: string;
}

export const createApiClient = (apiKey?: string, environment: OandaEnvironment = 'practice') => {
  const client = axios.create({
    baseURL: OANDA_ENVIRONMENTS[environment],
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept-Datetime-Format': 'RFC3339',
    },
  });

  return {
    // Account endpoints
    getAccountSummary: async (accountId: string) => {
      const response = await client.get(`/accounts/${accountId}/summary`);
      return response.data.account;
    },

    // Position endpoints
    getOpenPositions: async (accountId: string) => {
      const response = await client.get(`/accounts/${accountId}/openPositions`);
      return response.data.positions;
    },

    closePosition: async (accountId: string, instrument: string) => {
      const response = await client.put(`/accounts/${accountId}/positions/${instrument}/close`, {
        longUnits: "ALL",
        shortUnits: "ALL"
      });
      return response.data;
    },

    // Pricing endpoints
    getCurrentPrices: async (accountId: string, instruments: string[]) => {
      const response = await client.get(`/accounts/${accountId}/pricing`, {
        params: { instruments: instruments.join(',') }
      });
      return response.data;
    },

    // Order endpoints
    createOrder: async (accountId: string, order: {
      instrument: string;
      units: number;
      type: string;
      stopLossOnFill?: {
        price: string;
        timeInForce: string;
      };
      takeProfitOnFill?: {
        price: string;
        timeInForce: string;
      };
    }) => {
      const response = await client.post(`/accounts/${accountId}/orders`, {
        order: {
          ...order,
          timeInForce: 'FOK',
          positionFill: 'DEFAULT'
        }
      });
      return response.data;
    },

    // Trade endpoints
    getOpenTrades: async (accountId: string) => {
      const response = await client.get(`/accounts/${accountId}/openTrades`);
      return {
        trades: response.data?.trades || []
      };
    },

    getTradeHistory: async (accountId: string) => {
      try {
        const response = await client.get(`/accounts/${accountId}/trades`, {
          params: {
            state: 'CLOSED',
            count: 24 // Get last 24 trades
          }
        });
        
        return {
          trades: response.data?.trades?.map((trade: any) => ({
            id: trade.id,
            instrument: trade.instrument,
            price: trade.price,
            units: trade.initialUnits,
            realizedPL: trade.realizedPL,
            closeTime: trade.closeTime
          })) || []
        };
      } catch (error) {
        console.error('Error fetching trade history:', error);
        throw error;
      }
    },

    closeTrade: async (accountId: string, tradeId: string) => {
      const response = await client.put(`/accounts/${accountId}/trades/${tradeId}/close`);
      return response.data;
    },

    modifyTrade: async (accountId: string, tradeId: string, stopLoss?: string, takeProfit?: string) => {
      const response = await client.put(`/accounts/${accountId}/trades/${tradeId}/orders`, {
        stopLoss: stopLoss ? {
          price: stopLoss,
          timeInForce: 'GTC'
        } : undefined,
        takeProfit: takeProfit ? {
          price: takeProfit,
          timeInForce: 'GTC'
        } : undefined
      });
      return response.data;
    },
  };
};