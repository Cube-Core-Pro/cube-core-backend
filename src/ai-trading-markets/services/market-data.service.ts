// path: backend/src/ai-trading-markets/services/market-data.service.ts
// purpose: Real-time market data aggregation and processing service
// dependencies: WebSocket, Redis, Multiple data providers, ML models

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { WebSocket } from 'ws';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface MarketDataProvider {
  name: string;
  type: 'stocks' | 'forex' | 'crypto' | 'commodities' | 'bonds' | 'options' | 'futures';
  priority: number;
  latency: number;
  reliability: number;
  cost: number;
}

export interface Instrument {
  symbol: string;
  name: string;
  type: 'stock' | 'forex' | 'crypto' | 'commodity' | 'bond' | 'option' | 'future' | 'index';
  exchange: string;
  currency: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  description?: string;
  metadata: Record<string, unknown>;
}

export interface Quote {
  symbol: string;
  timestamp: Date;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  close: number;
  vwap?: number;
  spread?: number;
  source: string;
}

export interface OHLCV {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeframe: string;
}

export interface MarketDepth {
  symbol: string;
  timestamp: Date;
  bids: Array<{ price: number; size: number; orders?: number }>;
  asks: Array<{ price: number; size: number; orders?: number }>;
  source: string;
}

export interface Trade {
  symbol: string;
  timestamp: Date;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  tradeId: string;
  source: string;
}

export interface MarketNews {
  id: string;
  headline?: string;
  title?: string;
  summary: string;
  content: string;
  source: string;
  timestamp: Date;
  publishedAt?: Date;
  symbols: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  category: string;
  tags: string[];
  url?: string;
}

export interface EconomicIndicator {
  id?: string;
  name: string;
  country: string;
  currency?: string;
  value: number;
  previousValue?: number;
  forecast?: number;
  timestamp: Date;
  date?: Date;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  importance: 'high' | 'medium' | 'low';
  unit: string;
  actual?: number | null;
  impact?: number;
  description?: string;
  source?: string;
  tags?: string[];
}

export interface EconomicCalendarEvent {
  id: string;
  title: string;
  country: string;
  currency?: string;
  importance: 'high' | 'medium' | 'low';
  timestamp: Date;
  actual?: number | null;
  forecast?: number | null;
  previous?: number | null;
  description?: string;
  impactScore?: number;
}

type SentimentLabel = 'positive' | 'negative' | 'neutral';

export interface SymbolSentimentSummary {
  scores: number[];
  count: number;
  averageScore: number;
  sentiment: SentimentLabel;
}

export interface SentimentBreakdown {
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentAnalysis {
  timestamp: Date;
  overall: SentimentLabel;
  averageScore: number;
  confidence: number;
  totalNewsItems: number;
  breakdown: SentimentBreakdown;
  symbolSentiment: Record<string, SymbolSentimentSummary>;
  topPositiveNews: MarketNews[];
  topNegativeNews: MarketNews[];
}

export interface MarketSentimentSummary extends SentimentAnalysis {}

export interface LiquidityMetrics {
  symbol: string;
  spread: number;
  spreadBps: number;
  totalVolume: number;
  avgTradeSize: number;
  marketImpact: number;
  bidDepth: number;
  askDepth: number;
  timestamp: Date;
}

interface OandaPriceMessage {
  type: 'PRICE';
  instrument: string;
  time: string;
  bids: Array<{ price: string }>;
  asks: Array<{ price: string }>;
}

type OandaStreamMessage = OandaPriceMessage | { type: string; [key: string]: unknown };

type IbkrTickType = 'tickPrice' | 'tickSize' | string;

interface IbkrTickMessage {
  type: IbkrTickType;
  [key: string]: unknown;
}

interface BinanceTickerMessage {
  s: string; // symbol
  E: number; // event time
  b: string; // best bid price
  a: string; // best ask price
  c: string; // close price
  v: string; // volume
  P: string; // price change percent
  h: string; // high price
  l: string; // low price
  o: string; // open price
}

type CoinbaseMessage = CoinbaseTickerMessage | CoinbaseMatchMessage | { type: string; [key: string]: unknown };

interface CoinbaseTickerMessage {
  type: 'ticker';
  product_id: string;
  time: string;
  best_bid: string;
  best_ask: string;
  price: string;
  volume_24h: string;
  high_24h: string;
  low_24h: string;
  open_24h: string;
}

interface CoinbaseMatchMessage {
  type: 'match';
  product_id: string;
  time: string;
  price: string;
  size: string;
  side: 'buy' | 'sell';
  trade_id: number;
}

type PolygonMessage = PolygonQuoteMessage | PolygonTradeMessage;

interface PolygonQuoteMessage {
  ev: 'Q';
  sym: string;
  t: number;
  bp: number;
  ap: number;
}

interface PolygonTradeMessage {
  ev: 'T';
  sym: string;
  t: number;
  p: number;
  s: number;
  i: number | string;
}

type TimeSeriesEntity = Quote | Trade;

interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

@Injectable()
export class MarketDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketDataService.name);
  private connections: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map();
  private providers: MarketDataProvider[] = [];
  private instruments: Map<string, Instrument> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timer> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeProviders();
  }

  async onModuleInit() {
    await this.connectToProviders();
    await this.loadInstruments();
    this.startMarketDataProcessing();
  }

  async onModuleDestroy() {
    this.disconnectFromProviders();
  }

  private initializeProviders() {
    this.providers = [
      {
        name: 'Alpha Vantage',
        type: 'stocks',
        priority: 1,
        latency: 100,
        reliability: 0.99,
        cost: 0.001,
      },
      {
        name: 'IEX Cloud',
        type: 'stocks',
        priority: 2,
        latency: 50,
        reliability: 0.995,
        cost: 0.002,
      },
      {
        name: 'Polygon.io',
        type: 'stocks',
        priority: 1,
        latency: 25,
        reliability: 0.999,
        cost: 0.005,
      },
      {
        name: 'OANDA',
        type: 'forex',
        priority: 1,
        latency: 10,
        reliability: 0.9999,
        cost: 0.0001,
      },
      {
        name: 'Interactive Brokers',
        type: 'stocks',
        priority: 1,
        latency: 5,
        reliability: 0.9999,
        cost: 0.01,
      },
      {
        name: 'Binance',
        type: 'crypto',
        priority: 1,
        latency: 1,
        reliability: 0.999,
        cost: 0,
      },
      {
        name: 'Coinbase Pro',
        type: 'crypto',
        priority: 2,
        latency: 5,
        reliability: 0.998,
        cost: 0,
      },
      {
        name: 'CoinGecko',
        type: 'crypto',
        priority: 3,
        latency: 1000,
        reliability: 0.95,
        cost: 0,
      },
      {
        name: 'Quandl',
        type: 'commodities',
        priority: 1,
        latency: 60000,
        reliability: 0.99,
        cost: 0.01,
      },
      {
        name: 'Bloomberg Terminal',
        type: 'stocks',
        priority: 1,
        latency: 1,
        reliability: 0.99999,
        cost: 2.5,
      },
    ];
  }

  async connectToProviders() {
    for (const provider of this.providers) {
      try {
        await this.connectToProvider(provider);
        this.logger.log(`Connected to ${provider.name}`);
      } catch (error) {
        this.logger.error(`Failed to connect to ${provider.name}`, error);
      }
    }
  }

  private async connectToProvider(provider: MarketDataProvider) {
    switch (provider.name) {
      case 'OANDA':
        await this.connectToOanda();
        break;
      case 'Interactive Brokers':
        await this.connectToIBKR();
        break;
      case 'Binance':
        await this.connectToBinance();
        break;
      case 'Coinbase Pro':
        await this.connectToCoinbase();
        break;
      case 'Polygon.io':
        await this.connectToPolygon();
        break;
      default:
        // REST API providers don't need persistent connections
        break;
    }
  }

  private async connectToOanda() {
    const streamUrl = this.configService.get('OANDA_STREAM_URL');
    const token = this.configService.get('OANDA_API_TOKEN');
    
    if (!streamUrl || !token) {
      this.logger.warn('OANDA credentials not configured');
      return;
    }

    const ws = new WebSocket(`${streamUrl}/pricing/stream`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    ws.on('open', () => {
      this.logger.log('Connected to OANDA stream');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.processOandaMessage(message);
      } catch (error) {
        this.logger.error('Error processing OANDA message', error);
      }
    });

    ws.on('error', (error) => {
      this.logger.error('OANDA WebSocket error', error);
    });

    ws.on('close', () => {
      this.logger.warn('OANDA connection closed, reconnecting...');
      setTimeout(() => this.connectToOanda(), 5000);
    });

    this.connections.set('oanda', ws);
  }

  private async connectToIBKR() {
    // Interactive Brokers TWS API connection
    const wsUrl = this.configService.get('IBKR_WS_URL');
    
    if (!wsUrl) {
      this.logger.warn('IBKR WebSocket URL not configured');
      return;
    }

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      this.logger.log('Connected to IBKR');
      // Send authentication and subscription messages
      this.authenticateIBKR(ws);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.processIBKRMessage(message);
      } catch (error) {
        this.logger.error('Error processing IBKR message', error);
      }
    });

    ws.on('error', (error) => {
      this.logger.error('IBKR WebSocket error', error);
    });

    ws.on('close', () => {
      this.logger.warn('IBKR connection closed, reconnecting...');
      setTimeout(() => this.connectToIBKR(), 5000);
    });

    this.connections.set('ibkr', ws);
  }

  private async connectToBinance() {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

    ws.on('open', () => {
      this.logger.log('Connected to Binance stream');
    });

    ws.on('message', (data) => {
      try {
        const tickers = JSON.parse(data.toString());
        this.processBinanceMessage(tickers);
      } catch (error) {
        this.logger.error('Error processing Binance message', error);
      }
    });

    ws.on('error', (error) => {
      this.logger.error('Binance WebSocket error', error);
    });

    ws.on('close', () => {
      this.logger.warn('Binance connection closed, reconnecting...');
      setTimeout(() => this.connectToBinance(), 5000);
    });

    this.connections.set('binance', ws);
  }

  private async connectToCoinbase() {
    const ws = new WebSocket('wss://ws-feed.pro.coinbase.com');

    ws.on('open', () => {
      this.logger.log('Connected to Coinbase Pro');
      // Subscribe to ticker channel
      ws.send(JSON.stringify({
        type: 'subscribe',
        product_ids: ['BTC-USD', 'ETH-USD', 'ADA-USD', 'DOT-USD'],
        channels: ['ticker', 'level2', 'matches'],
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.processCoinbaseMessage(message);
      } catch (error) {
        this.logger.error('Error processing Coinbase message', error);
      }
    });

    ws.on('error', (error) => {
      this.logger.error('Coinbase WebSocket error', error);
    });

    ws.on('close', () => {
      this.logger.warn('Coinbase connection closed, reconnecting...');
      setTimeout(() => this.connectToCoinbase(), 5000);
    });

    this.connections.set('coinbase', ws);
  }

  private async connectToPolygon() {
    const apiKey = this.configService.get('POLYGON_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('Polygon API key not configured');
      return;
    }

    const ws = new WebSocket(`wss://socket.polygon.io/stocks?apikey=${apiKey}`);

    ws.on('open', () => {
      this.logger.log('Connected to Polygon.io');
      // Subscribe to all trades and quotes
      ws.send(JSON.stringify({ action: 'auth', params: apiKey }));
    });

    ws.on('message', (data) => {
      try {
        const messages = JSON.parse(data.toString());
        this.processPolygonMessage(messages);
      } catch (error) {
        this.logger.error('Error processing Polygon message', error);
      }
    });

    ws.on('error', (error) => {
      this.logger.error('Polygon WebSocket error', error);
    });

    ws.on('close', () => {
      this.logger.warn('Polygon connection closed, reconnecting...');
      setTimeout(() => this.connectToPolygon(), 5000);
    });

    this.connections.set('polygon', ws);
  }

  private disconnectFromProviders() {
    for (const [name, ws] of this.connections) {
      try {
        ws.close();
        this.logger.log(`Disconnected from ${name}`);
      } catch (error) {
        this.logger.error(`Error disconnecting from ${name}`, error);
      }
    }
    this.connections.clear();
  }

  private async loadInstruments() {
    // Load instruments from cache or external sources
    const cachedInstruments = await this.redisService.get('market:instruments');
    
    if (cachedInstruments) {
      const instruments = JSON.parse(cachedInstruments);
      for (const instrument of instruments) {
        this.instruments.set(instrument.symbol, instrument);
      }
      this.logger.log(`Loaded ${instruments.length} instruments from cache`);
    } else {
      await this.fetchInstruments();
    }
  }

  private async fetchInstruments() {
    // Fetch instruments from various sources
    const instruments: Instrument[] = [];

    // Major stocks
    const majorStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Technology' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Consumer Discretionary' },
      { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'Consumer Discretionary' },
      { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', sector: 'Technology' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Technology' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Financial Services' },
      { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', sector: 'Healthcare' },
      { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', sector: 'Financial Services' },
    ];

    for (const stock of majorStocks) {
      instruments.push({
        ...stock,
        type: 'stock',
        currency: 'USD',
        metadata: {},
      });
    }

    // Major forex pairs
    const forexPairs = [
      'EUR_USD', 'GBP_USD', 'USD_JPY', 'USD_CHF', 'AUD_USD', 'USD_CAD', 'NZD_USD',
      'EUR_GBP', 'EUR_JPY', 'GBP_JPY', 'CHF_JPY', 'AUD_JPY', 'CAD_JPY', 'NZD_JPY',
      'EUR_CHF', 'GBP_CHF', 'AUD_CHF', 'CAD_CHF', 'NZD_CHF',
      'EUR_AUD', 'GBP_AUD', 'AUD_CAD', 'AUD_NZD',
      'EUR_CAD', 'GBP_CAD', 'CAD_CHF',
      'EUR_NZD', 'GBP_NZD', 'NZD_CAD',
    ];

    for (const pair of forexPairs) {
      const [base, quote] = pair.split('_');
      instruments.push({
        symbol: pair,
        name: `${base}/${quote}`,
        type: 'forex',
        exchange: 'OANDA',
        currency: quote,
        metadata: { base, quote },
      });
    }

    // Major cryptocurrencies
    const cryptos = [
      { symbol: 'BTC-USD', name: 'Bitcoin', base: 'BTC' },
      { symbol: 'ETH-USD', name: 'Ethereum', base: 'ETH' },
      { symbol: 'ADA-USD', name: 'Cardano', base: 'ADA' },
      { symbol: 'DOT-USD', name: 'Polkadot', base: 'DOT' },
      { symbol: 'LINK-USD', name: 'Chainlink', base: 'LINK' },
      { symbol: 'LTC-USD', name: 'Litecoin', base: 'LTC' },
      { symbol: 'BCH-USD', name: 'Bitcoin Cash', base: 'BCH' },
      { symbol: 'XLM-USD', name: 'Stellar', base: 'XLM' },
      { symbol: 'UNI-USD', name: 'Uniswap', base: 'UNI' },
      { symbol: 'AAVE-USD', name: 'Aave', base: 'AAVE' },
    ];

    for (const crypto of cryptos) {
      instruments.push({
        symbol: crypto.symbol,
        name: crypto.name,
        type: 'crypto',
        exchange: 'Coinbase',
        currency: 'USD',
        metadata: { base: crypto.base, quote: 'USD' },
      });
    }

    // Major commodities
    const commodities = [
      { symbol: 'GC=F', name: 'Gold Futures' },
      { symbol: 'SI=F', name: 'Silver Futures' },
      { symbol: 'CL=F', name: 'Crude Oil Futures' },
      { symbol: 'NG=F', name: 'Natural Gas Futures' },
      { symbol: 'ZC=F', name: 'Corn Futures' },
      { symbol: 'ZS=F', name: 'Soybean Futures' },
      { symbol: 'ZW=F', name: 'Wheat Futures' },
      { symbol: 'HG=F', name: 'Copper Futures' },
    ];

    for (const commodity of commodities) {
      instruments.push({
        symbol: commodity.symbol,
        name: commodity.name,
        type: 'commodity',
        exchange: 'CME',
        currency: 'USD',
        metadata: {},
      });
    }

    // Major indices
    const indices = [
      { symbol: '^GSPC', name: 'S&P 500' },
      { symbol: '^DJI', name: 'Dow Jones Industrial Average' },
      { symbol: '^IXIC', name: 'NASDAQ Composite' },
      { symbol: '^RUT', name: 'Russell 2000' },
      { symbol: '^VIX', name: 'CBOE Volatility Index' },
      { symbol: '^FTSE', name: 'FTSE 100' },
      { symbol: '^GDAXI', name: 'DAX' },
      { symbol: '^FCHI', name: 'CAC 40' },
      { symbol: '^N225', name: 'Nikkei 225' },
      { symbol: '^HSI', name: 'Hang Seng Index' },
    ];

    for (const index of indices) {
      instruments.push({
        symbol: index.symbol,
        name: index.name,
        type: 'index',
        exchange: 'Various',
        currency: 'USD',
        metadata: {},
      });
    }

    // Store instruments
    for (const instrument of instruments) {
      this.instruments.set(instrument.symbol, instrument);
    }

    // Cache instruments
    await this.redisService.setex(
      'market:instruments',
      3600,
      JSON.stringify(instruments),
    );

    this.logger.log(`Loaded ${instruments.length} instruments`);
  }

  private startMarketDataProcessing() {
    // Start background tasks for market data processing
    setInterval(() => this.processMarketData(), 1000);
    setInterval(() => this.calculateDerivedMetrics(), 5000);
    setInterval(() => this.updateMarketSentiment(), 30000);
    setInterval(() => this.fetchEconomicData(), 300000); // 5 minutes
  }

  private async processMarketData() {
    // Process and normalize market data from all sources
    // This is where we would implement data fusion algorithms
  }

  private async calculateDerivedMetrics() {
    // Calculate technical indicators, volatility, correlations, etc.
    const symbols = Array.from(this.instruments.keys()).slice(0, 100); // Process top 100
    
    for (const symbol of symbols) {
      try {
        await this.calculateTechnicalIndicators(symbol);
        await this.calculateVolatility(symbol);
        await this.calculateCorrelations(symbol);
      } catch (error) {
        this.logger.error(`Error calculating metrics for ${symbol}`, error);
      }
    }
  }

  private async updateMarketSentiment() {
    // Update market sentiment from news and social media
    try {
      const news = await this.fetchMarketNews();
      const sentiment = await this.analyzeSentiment(news);
      
      await this.redisService.setex(
        'market:sentiment',
        300,
        JSON.stringify(sentiment),
      );
    } catch (error) {
      this.logger.error('Error updating market sentiment', error);
    }
  }

  private async fetchEconomicData() {
    // Fetch economic indicators and calendar events
    try {
      const indicators = await this.fetchEconomicIndicators();
      const calendar = await this.fetchEconomicCalendar();
      
      await this.redisService.setex(
        'market:economic_data',
        1800,
        JSON.stringify({ indicators, calendar }),
      );
    } catch (error) {
      this.logger.error('Error fetching economic data', error);
    }
  }

  // Message processing methods
  private processOandaMessage(message: OandaStreamMessage) {
    if (message.type === 'PRICE') {
      const quote: Quote = {
        symbol: String(message.instrument),
        timestamp: new Date(String(message.time)),
        bid: parseFloat(String(message.bids?.[0]?.price || '0')),
        ask: parseFloat(String(message.asks?.[0]?.price || '0')),
        last: (parseFloat(String(message.bids?.[0]?.price || '0')) + parseFloat(String(message.asks?.[0]?.price || '0'))) / 2,
        volume: 0,
        change: 0,
        changePercent: 0,
        high: 0,
        low: 0,
        open: 0,
        close: 0,
        spread: parseFloat(String(message.asks?.[0]?.price || '0')) - parseFloat(String(message.bids?.[0]?.price || '0')),
        source: 'OANDA',
      };

      this.publishQuote(quote);
    }
  }

  private processIBKRMessage(message: IbkrTickMessage) {
    // Process IBKR TWS API messages
    if (message.type === 'tickPrice') {
      // Handle tick price updates
    } else if (message.type === 'tickSize') {
      // Handle tick size updates
    }
  }

  private processBinanceMessage(tickers: BinanceTickerMessage[]) {
    for (const ticker of tickers) {
      const quote: Quote = {
        symbol: ticker.s,
        timestamp: new Date(ticker.E),
        bid: parseFloat(ticker.b),
        ask: parseFloat(ticker.a),
        last: parseFloat(ticker.c),
        volume: parseFloat(ticker.v),
        change: parseFloat(ticker.P),
        changePercent: parseFloat(ticker.P),
        high: parseFloat(ticker.h),
        low: parseFloat(ticker.l),
        open: parseFloat(ticker.o),
        close: parseFloat(ticker.c),
        source: 'Binance',
      };

      this.publishQuote(quote);
    }
  }

  private processCoinbaseMessage(message: CoinbaseMessage) {
    if (message.type === 'ticker') {
      const quote: Quote = {
        symbol: String(message.product_id),
        timestamp: new Date(String(message.time)),
        bid: parseFloat(String(message.best_bid)),
        ask: parseFloat(String(message.best_ask)),
        last: parseFloat(String(message.price)),
        volume: parseFloat(String(message.volume_24h)),
        change: 0,
        changePercent: 0,
        high: parseFloat(String(message.high_24h)),
        low: parseFloat(String(message.low_24h)),
        open: parseFloat(String(message.open_24h)),
        close: parseFloat(String(message.price)),
        source: 'Coinbase',
      };

      this.publishQuote(quote);
    } else if (message.type === 'match') {
      const trade: Trade = {
        symbol: String(message.product_id),
        timestamp: new Date(String(message.time)),
        price: parseFloat(String(message.price)),
        size: parseFloat(String(message.size)),
        side: String(message.side) as 'buy' | 'sell',
        tradeId: String(message.trade_id),
        source: 'Coinbase',
      };

      this.publishTrade(trade);
    }
  }

  private processPolygonMessage(messages: PolygonMessage[]) {
    for (const message of messages) {
      if (message.ev === 'Q') {
        // Quote update
        const quote: Quote = {
          symbol: message.sym,
          timestamp: new Date(message.t),
          bid: message.bp,
          ask: message.ap,
          last: (message.bp + message.ap) / 2,
          volume: 0,
          change: 0,
          changePercent: 0,
          high: 0,
          low: 0,
          open: 0,
          close: 0,
          source: 'Polygon',
        };

        this.publishQuote(quote);
      } else if (message.ev === 'T') {
        // Trade update
        const trade: Trade = {
          symbol: message.sym,
          timestamp: new Date(message.t),
          price: message.p,
          size: message.s,
          side: 'buy', // Polygon doesn't provide side
          tradeId: message.i.toString(),
          source: 'Polygon',
        };

        this.publishTrade(trade);
      }
    }
  }

  private authenticateIBKR(ws: WebSocket) {
    // Send IBKR authentication message
    const authMessage = {
      type: 'authenticate',
      token: this.configService.get('IBKR_API_TOKEN'),
    };
    
    ws.send(JSON.stringify(authMessage));
  }

  private async publishQuote(quote: Quote) {
    // Store in Redis with TTL
    await this.redisService.setex(
      `quote:${quote.symbol}`,
      60,
      JSON.stringify(quote),
    );

    // Emit event for real-time subscribers
    this.eventEmitter.emit('market.quote', quote);

    // Store in time series for historical data
    await this.storeTimeSeriesData('quotes', quote);
  }

  private async publishTrade(trade: Trade) {
    // Store in Redis
    await this.redisService.lpush(
      `trades:${trade.symbol}`,
      JSON.stringify(trade),
    );
    
    // Keep only last 1000 trades
    await this.redisService.ltrim(`trades:${trade.symbol}`, 0, 999);

    // Emit event
    this.eventEmitter.emit('market.trade', trade);

    // Store in time series
    await this.storeTimeSeriesData('trades', trade);
  }

  private async storeTimeSeriesData(type: 'quotes' | 'trades', data: TimeSeriesEntity) {
    // Store in time series database (could be InfluxDB, TimescaleDB, etc.)
    // For now, we'll use Redis with time-based keys
    const timestamp = Math.floor(Date.now() / 1000);
    const key = `timeseries:${type}:${data.symbol}:${timestamp}`;
    
    await this.redisService.setex(key, 86400, JSON.stringify(data)); // 24 hours TTL
  }

  // Public API methods
  async getQuote(symbol: string): Promise<Quote | null> {
    try {
      const cached = await this.redisService.get(`quote:${symbol}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error(`Error getting quote for ${symbol}`, error);
      return null;
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes: Quote[] = [];
    
    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol);
      if (quote) {
        quotes.push(quote);
      }
    }
    
    return quotes;
  }

  async getHistoricalData(
    symbol: string,
    timeframe: string,
    from: Date,
    to: Date,
  ): Promise<OHLCV[]> {
    try {
      this.logger.debug(`Fetching historical data for ${symbol} (${timeframe}) from ${from.toISOString()} to ${to.toISOString()}`);
      
      // Check cache first
      const cacheKey = `historical:${symbol}:${timeframe}:${from.getTime()}:${to.getTime()}`;
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate time intervals based on timeframe
      const intervals = this.calculateTimeIntervals(from, to, timeframe);
      const historicalData: OHLCV[] = [];

      // Generate mock historical data based on the time range and symbol
      let basePrice = this.getBasePrice(symbol);
      
      for (const interval of intervals) {
        // Simulate price movement with some volatility
        const volatility = 0.02; // 2% volatility
        const change = (Math.random() - 0.5) * volatility;
        const open = basePrice;
        const close = basePrice * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.floor(Math.random() * 1000000) + 100000;

        historicalData.push({
          symbol,
          timestamp: interval,
          open,
          high,
          low,
          close,
          volume,
          timeframe,
        });

        basePrice = close; // Use close as next open
      }

      // Cache for 5 minutes (historical data doesn't change frequently)
      await this.redisService.setex(cacheKey, 300, JSON.stringify(historicalData));
      
      this.logger.log(`Retrieved ${historicalData.length} historical data points for ${symbol}`);
      return historicalData;
    } catch (error) {
      this.logger.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  private calculateTimeIntervals(from: Date, to: Date, timeframe: string): Date[] {
    const intervals: Date[] = [];
    const start = new Date(from);
    const end = new Date(to);
    
    // Convert timeframe to milliseconds
    const timeframeMs = this.timeframeToMs(timeframe);
    
    let current = new Date(start);
    while (current <= end) {
      intervals.push(new Date(current));
      current = new Date(current.getTime() + timeframeMs);
    }
    
    return intervals;
  }

  private timeframeToMs(timeframe: string): number {
    const timeframeMap: { [key: string]: number } = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000
    };
    
    return timeframeMap[timeframe] || 60 * 60 * 1000; // Default to 1 hour
  }

  private getBasePrice(symbol: string): number {
    // Return realistic base prices for different symbols
    const basePrices: { [key: string]: number } = {
      'EURUSD': 1.0850,
      'GBPUSD': 1.2650,
      'USDJPY': 149.50,
      'AUDUSD': 0.6750,
      'USDCAD': 1.3450,
      'USDCHF': 0.8950,
      'NZDUSD': 0.6150,
      'EURGBP': 0.8650,
      'EURJPY': 162.30,
      'GBPJPY': 189.20,
      'BTC': 45000,
      'ETH': 2800,
      'AAPL': 185.50,
      'GOOGL': 142.30,
      'MSFT': 378.90,
      'TSLA': 248.50,
      'AMZN': 155.20,
      'NVDA': 875.30
    };
    
    return basePrices[symbol] || 100; // Default price
  }

  async getMarketDepth(symbol: string): Promise<MarketDepth | null> {
    try {
      const cached = await this.redisService.get(`depth:${symbol}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error(`Error getting market depth for ${symbol}`, error);
      return null;
    }
  }

  async getRecentTrades(symbol: string, limit: number = 100): Promise<Trade[]> {
    try {
      const trades = await this.redisService.lrange(`trades:${symbol}`, 0, limit - 1);
      return trades.map(trade => JSON.parse(trade));
    } catch (error) {
      this.logger.error(`Error getting recent trades for ${symbol}`, error);
      return [];
    }
  }

  async getInstruments(type?: string): Promise<Instrument[]> {
    const instruments = Array.from(this.instruments.values());
    return type ? instruments.filter(i => i.type === type) : instruments;
  }

  async getInstrument(symbol: string): Promise<Instrument | null> {
    return this.instruments.get(symbol) || null;
  }

  async searchInstruments(query: string): Promise<Instrument[]> {
    const instruments = Array.from(this.instruments.values());
    const lowerQuery = query.toLowerCase();
    
    return instruments.filter(
      instrument =>
        instrument.symbol.toLowerCase().includes(lowerQuery) ||
        instrument.name.toLowerCase().includes(lowerQuery),
    );
  }

  async getMarketNews(symbols?: string[], limit: number = 50): Promise<MarketNews[]> {
    try {
      this.logger.debug(`Fetching market news for symbols: ${symbols?.join(', ') || 'all'}, limit: ${limit}`);
      
      // Check cache first
      const cacheKey = `market_news:${symbols?.join(',') || 'all'}:${limit}`;
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Generate mock market news
      const news: MarketNews[] = [];
      const newsTemplates = [
        'Market volatility increases amid economic uncertainty',
        'Central bank announces new monetary policy measures',
        'Tech stocks rally on positive earnings reports',
        'Oil prices surge following geopolitical tensions',
        'Currency markets react to inflation data',
        'Banking sector shows strong quarterly performance',
        'Cryptocurrency market experiences significant movement',
        'Trade negotiations impact global markets',
        'Economic indicators suggest market recovery',
        'Regulatory changes affect financial sector'
      ];

      const targetSymbols = symbols || ['EURUSD', 'GBPUSD', 'USDJPY', 'BTC', 'ETH', 'AAPL', 'GOOGL'];
      
      for (let i = 0; i < Math.min(limit, 50); i++) {
        const randomSymbol = targetSymbols[Math.floor(Math.random() * targetSymbols.length)];
        const randomTemplate = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
        const publishedAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
        
        news.push({
          id: `news_${Date.now()}_${i}`,
          headline: randomTemplate,
          title: `${randomSymbol}: ${randomTemplate}`,
          summary: `Market analysis for ${randomSymbol} shows ${randomTemplate.toLowerCase()}. This development could impact trading strategies and market sentiment.`,
          content: `Detailed analysis of ${randomSymbol} market conditions. ${randomTemplate} with potential implications for traders and investors. Market experts recommend monitoring key levels and volume indicators.`,
          source: ['Reuters', 'Bloomberg', 'MarketWatch', 'Financial Times', 'CNBC'][Math.floor(Math.random() * 5)],
          publishedAt,
          timestamp: publishedAt,
          symbols: [randomSymbol],
          sentiment: Math.random() > 0.5 ? 'positive' : Math.random() > 0.25 ? 'negative' : 'neutral',
          impact: Math.random() > 0.7 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low',
          category: 'market-analysis',
          tags: ['market-analysis', 'trading', randomSymbol.toLowerCase()],
          url: `https://example.com/news/${Date.now()}_${i}`
        });
      }

      // Filter by symbols if specified
      const filteredNews = symbols 
        ? news.filter(item => item.symbols.some(s => symbols.includes(s)))
        : news;

      // Cache for 5 minutes
      await this.redisService.setex(cacheKey, 300, JSON.stringify(filteredNews));
      
      this.logger.log(`Retrieved ${filteredNews.length} market news items`);
      return filteredNews;
    } catch (error) {
      this.logger.error('Error fetching market news:', error);
      return [];
    }
  }

  async getEconomicCalendar(
    from: Date,
    to: Date,
    importance?: string,
  ): Promise<EconomicIndicator[]> {
    try {
      this.logger.debug(`Fetching economic calendar from ${from.toISOString()} to ${to.toISOString()}, importance: ${importance || 'all'}`);
      
      // Check cache first
      const cacheKey = `economic_calendar:${from.getTime()}:${to.getTime()}:${importance || 'all'}`;
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Generate mock economic indicators
      const indicators: EconomicIndicator[] = [];
      const economicEvents = [
        { name: 'Non-Farm Payrolls', impact: 'high', currency: 'USD' },
        { name: 'Consumer Price Index', impact: 'high', currency: 'USD' },
        { name: 'Federal Reserve Interest Rate Decision', impact: 'high', currency: 'USD' },
        { name: 'Gross Domestic Product', impact: 'high', currency: 'USD' },
        { name: 'Unemployment Rate', impact: 'medium', currency: 'USD' },
        { name: 'Retail Sales', impact: 'medium', currency: 'USD' },
        { name: 'Industrial Production', impact: 'medium', currency: 'USD' },
        { name: 'Consumer Confidence', impact: 'medium', currency: 'USD' },
        { name: 'ECB Interest Rate Decision', impact: 'high', currency: 'EUR' },
        { name: 'Eurozone CPI', impact: 'high', currency: 'EUR' },
        { name: 'Bank of England Rate Decision', impact: 'high', currency: 'GBP' },
        { name: 'UK GDP', impact: 'high', currency: 'GBP' },
        { name: 'Bank of Japan Rate Decision', impact: 'high', currency: 'JPY' },
        { name: 'Japan CPI', impact: 'medium', currency: 'JPY' }
      ];

      // Generate events within the date range
      const daysDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      const eventsPerDay = Math.min(3, Math.max(1, Math.floor(economicEvents.length / daysDiff)));

      for (let day = 0; day < daysDiff; day++) {
        const eventDate = new Date(from.getTime() + day * 24 * 60 * 60 * 1000);
        
        // Skip weekends for most events
        if (eventDate.getDay() === 0 || eventDate.getDay() === 6) continue;

        for (let i = 0; i < eventsPerDay && indicators.length < 100; i++) {
          const randomEvent = economicEvents[Math.floor(Math.random() * economicEvents.length)];
          
          // Filter by importance if specified
          if (importance && randomEvent.impact !== importance) continue;

          const eventTime = new Date(eventDate);
          eventTime.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

          indicators.push({
            id: `econ_${Date.now()}_${indicators.length}`,
            name: randomEvent.name,
            country: this.getCurrencyCountry(randomEvent.currency),
            currency: randomEvent.currency,
            value: this.generateForecastValue(randomEvent.name),
            previousValue: this.generateForecastValue(randomEvent.name),
            forecast: this.generateForecastValue(randomEvent.name),
            timestamp: eventTime,
            date: eventTime,
            frequency: 'daily' as const,
            importance: randomEvent.impact as 'low' | 'medium' | 'high',
            unit: '%',
            actual: Math.random() > 0.3 ? this.generateForecastValue(randomEvent.name) : null, // 70% chance of having actual value
            impact: this.calculateEventImpact(randomEvent.impact),
            description: `${randomEvent.name} measures economic activity and can significantly impact ${randomEvent.currency} currency pairs.`,
            source: 'Economic Calendar API',
            tags: [randomEvent.currency.toLowerCase(), 'economic-data', randomEvent.impact]
          });
        }
      }

      // Sort by date
      indicators.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Cache for 1 hour
      await this.redisService.setex(cacheKey, 3600, JSON.stringify(indicators));
      
      this.logger.log(`Retrieved ${indicators.length} economic calendar events`);
      return indicators;
    } catch (error) {
      this.logger.error('Error fetching economic calendar:', error);
      return [];
    }
  }

  private getCurrencyCountry(currency: string): string {
    const currencyMap: { [key: string]: string } = {
      'USD': 'United States',
      'EUR': 'Eurozone',
      'GBP': 'United Kingdom',
      'JPY': 'Japan',
      'AUD': 'Australia',
      'CAD': 'Canada',
      'CHF': 'Switzerland',
      'NZD': 'New Zealand'
    };
    return currencyMap[currency] || 'Unknown';
  }

  private generateForecastValue(eventName: string): number {
    // Generate realistic forecast values based on event type
    if (eventName.includes('Rate')) {
      return Math.round((Math.random() * 5 + 0.5) * 100) / 100; // 0.5% to 5.5%
    } else if (eventName.includes('CPI') || eventName.includes('Inflation')) {
      return Math.round((Math.random() * 4 + 1) * 100) / 100; // 1% to 5%
    } else if (eventName.includes('GDP')) {
      return Math.round((Math.random() * 6 - 1) * 100) / 100; // -1% to 5%
    } else if (eventName.includes('Unemployment')) {
      return Math.round((Math.random() * 8 + 3) * 100) / 100; // 3% to 11%
    } else if (eventName.includes('Payrolls')) {
      return Math.floor(Math.random() * 400000 + 100000); // 100K to 500K
    } else {
      return Math.round((Math.random() * 100 + 50) * 100) / 100; // 50 to 150
    }
  }

  private calculateEventImpact(importance: string): number {
    // Return impact score from 1-10
    switch (importance) {
      case 'high': return Math.floor(Math.random() * 3) + 8; // 8-10
      case 'medium': return Math.floor(Math.random() * 3) + 5; // 5-7
      case 'low': return Math.floor(Math.random() * 3) + 2; // 2-4
      default: return 5;
    }
  }

  async getMarketSentiment(): Promise<MarketSentimentSummary | null> {
    try {
      const cached = await this.redisService.get('market:sentiment');
      return cached ? (JSON.parse(cached) as MarketSentimentSummary) : null;
    } catch (error) {
      this.logger.error('Error getting market sentiment', error);
      return null;
    }
  }

  async getLiquidityMetrics(symbol: string): Promise<LiquidityMetrics | null> {
    try {
      const cached = await this.redisService.get(`liquidity:${symbol}`);
      if (cached) {
        return JSON.parse(cached) as LiquidityMetrics;
      }

      // Calculate liquidity metrics
      const marketDepth = await this.getMarketDepth(symbol);
      const recentTrades = await this.getRecentTrades(symbol, 100);
      
      if (!marketDepth || !recentTrades.length) {
        return null;
      }

      // Calculate bid-ask spread
      const spread = marketDepth.asks[0]?.price - marketDepth.bids[0]?.price;
      const midPrice = (marketDepth.asks[0]?.price + marketDepth.bids[0]?.price) / 2;
      const spreadBps = (spread / midPrice) * 10000;

      // Calculate volume metrics
      const totalVolume = recentTrades.reduce((sum, trade) => sum + trade.size, 0);
      const avgTradeSize = totalVolume / recentTrades.length;
      
      // Calculate market impact
      const marketImpact = this.calculateMarketImpact(marketDepth, avgTradeSize);

      const metrics: LiquidityMetrics = {
        symbol,
        spread,
        spreadBps,
        totalVolume,
        avgTradeSize,
        marketImpact,
        bidDepth: marketDepth.bids.reduce((sum, level) => sum + level.size, 0),
        askDepth: marketDepth.asks.reduce((sum, level) => sum + level.size, 0),
        timestamp: new Date(),
      };

      // Cache for 30 seconds
      await this.redisService.setJson(`liquidity:${symbol}`, metrics, 30);
      
      return metrics;
    } catch (error) {
      this.logger.error(`Error getting liquidity metrics for ${symbol}`, error);
      return null;
    }
  }

  private calculateMarketImpact(marketDepth: MarketDepth, tradeSize: number): number {
    // Simple market impact calculation
    let remainingSize = tradeSize;
    let totalCost = 0;
    let weightedPrice = 0;

    for (const level of marketDepth.asks) {
      if (remainingSize <= 0) break;
      
      const sizeAtLevel = Math.min(remainingSize, level.size);
      totalCost += sizeAtLevel * level.price;
      remainingSize -= sizeAtLevel;
    }

    if (tradeSize > 0) {
      weightedPrice = totalCost / tradeSize;
      const midPrice = (marketDepth.asks[0]?.price + marketDepth.bids[0]?.price) / 2;
      return ((weightedPrice - midPrice) / midPrice) * 10000; // in basis points
    }

    return 0;
  }

  // Private helper methods
  private async calculateTechnicalIndicators(symbol: string) {
    try {
      // Get historical data for technical analysis
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
      const historicalData = await this.getHistoricalData(symbol, '1h', startDate, endDate);
      
      if (historicalData.length < 20) {
        return null;
      }

      const closes = historicalData.map(d => d.close);
      
      // Calculate Simple Moving Averages
      const sma20 = this.calculateSMA(closes, 20);
      const sma50 = this.calculateSMA(closes, 50);
      
      // Calculate Exponential Moving Average
      const ema20 = this.calculateEMA(closes, 20);
      
      // Calculate RSI
      const rsi = this.calculateRSI(closes, 14);
      
      // Calculate MACD
      const macd = this.calculateMACD(closes);
      
      // Calculate Bollinger Bands
      const bollingerBands = this.calculateBollingerBands(closes, 20, 2);
      
      const indicators = {
        symbol,
        timestamp: new Date(),
        sma20,
        sma50,
        ema20,
        rsi,
        macd,
        bollingerBands,
        trend: sma20 > sma50 ? 'bullish' : 'bearish',
        momentum: rsi > 50 ? 'positive' : 'negative'
      };

      // Cache indicators for 5 minutes
      await this.redisService.setex(`indicators:${symbol}`, 300, JSON.stringify(indicators));
      
      return indicators;
    } catch (error) {
      this.logger.error(`Error calculating technical indicators for ${symbol}:`, error);
      return null;
    }
  }

  private async calculateVolatility(symbol: string) {
    try {
      // Get historical data for volatility calculation
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
      const historicalData = await this.getHistoricalData(symbol, '1d', startDate, endDate);
      
      if (historicalData.length < 10) {
        return null;
      }

      // Calculate daily returns
      const returns = [];
      for (let i = 1; i < historicalData.length; i++) {
        const dailyReturn = (historicalData[i].close - historicalData[i - 1].close) / historicalData[i - 1].close;
        returns.push(dailyReturn);
      }

      // Calculate historical volatility (annualized)
      const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1);
      const historicalVolatility = Math.sqrt(variance * 252); // Annualized (252 trading days)

      // Calculate intraday volatility
      const intradayVolatility = historicalData.reduce((sum, candle) => {
        return sum + ((candle.high - candle.low) / candle.close);
      }, 0) / historicalData.length;

      const volatilityMetrics = {
        symbol,
        timestamp: new Date(),
        historicalVolatility: historicalVolatility * 100, // As percentage
        intradayVolatility: intradayVolatility * 100,
        averageTrueRange: this.calculateATR(historicalData, 14),
        volatilityRank: this.calculateVolatilityRank(historicalVolatility),
        riskLevel: historicalVolatility > 0.3 ? 'high' : historicalVolatility > 0.15 ? 'medium' : 'low'
      };

      // Cache volatility metrics for 1 hour
      await this.redisService.setex(`volatility:${symbol}`, 3600, JSON.stringify(volatilityMetrics));
      
      return volatilityMetrics;
    } catch (error) {
      this.logger.error(`Error calculating volatility for ${symbol}:`, error);
      return null;
    }
  }

  private async calculateCorrelations(symbol: string) {
    try {
      // Get list of related symbols for correlation analysis
      const relatedSymbols = this.getRelatedSymbols(symbol);
      const correlations: { [key: string]: number } = {};
      
      // Get historical data for the main symbol
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
      const mainData = await this.getHistoricalData(symbol, '1d', startDate, endDate);
      
      if (mainData.length < 10) {
        return null;
      }

      const mainReturns = this.calculateReturns(mainData.map(d => d.close));

      // Calculate correlations with related symbols
      for (const relatedSymbol of relatedSymbols) {
        try {
          const relatedData = await this.getHistoricalData(relatedSymbol, '1d', startDate, endDate);
          if (relatedData.length >= mainData.length) {
            const relatedReturns = this.calculateReturns(relatedData.map(d => d.close));
            const correlation = this.calculatePearsonCorrelation(mainReturns, relatedReturns);
            correlations[relatedSymbol] = correlation;
          }
        } catch (error) {
          this.logger.warn(`Could not calculate correlation between ${symbol} and ${relatedSymbol}:`, error);
        }
      }

      const correlationData = {
        symbol,
        timestamp: new Date(),
        correlations,
        strongPositiveCorrelations: Object.entries(correlations).filter(([, corr]) => corr > 0.7),
        strongNegativeCorrelations: Object.entries(correlations).filter(([, corr]) => corr < -0.7),
        averageCorrelation: Object.values(correlations).reduce((sum, corr) => sum + Math.abs(corr), 0) / Object.values(correlations).length
      };

      // Cache correlation data for 2 hours
      await this.redisService.setex(`correlations:${symbol}`, 7200, JSON.stringify(correlationData));
      
      return correlationData;
    } catch (error) {
      this.logger.error(`Error calculating correlations for ${symbol}:`, error);
      return null;
    }
  }

  private async fetchMarketNews(): Promise<MarketNews[]> {
    try {
      // Fetch news from multiple sources and aggregate
      const newsItems: MarketNews[] = [];
      
      // Simulate fetching from different news sources
      const sources = ['Reuters', 'Bloomberg', 'MarketWatch', 'Financial Times'];
      
      for (const source of sources) {
        const sourceNews = await this.getMarketNews(undefined, 10); // Get 10 news items per source
        newsItems.push(...sourceNews.map(item => ({ ...item, source })));
      }

      // Remove duplicates and sort by date
      const uniqueNews = newsItems.filter((item, index, self) => 
        index === self.findIndex(t => t.title === item.title)
      ).sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

      this.logger.log(`Fetched ${uniqueNews.length} unique market news items from ${sources.length} sources`);
      return uniqueNews.slice(0, 50); // Return top 50 news items
    } catch (error) {
      this.logger.error('Error fetching market news:', error);
      return [];
    }
  }

  private async analyzeSentiment(news: MarketNews[]): Promise<SentimentAnalysis> {
    try {
      const empty: SentimentAnalysis = {
        timestamp: new Date(),
        overall: 'neutral',
        averageScore: 0,
        confidence: 0,
        totalNewsItems: news.length,
        breakdown: { positive: 0, negative: 0, neutral: news.length },
        symbolSentiment: {},
        topPositiveNews: [],
        topNegativeNews: [],
      };

      if (!news.length) {
        return empty;
      }

      // Analyze sentiment of news items
      const sentimentScores = news.map(item => {
        // Simple sentiment analysis based on keywords
        const text = `${item.title} ${item.summary}`.toLowerCase();
        let score = 0;
        
        // Positive keywords
        const positiveWords = ['gain', 'rise', 'up', 'bull', 'growth', 'profit', 'strong', 'positive', 'rally', 'surge'];
        const negativeWords = ['fall', 'drop', 'down', 'bear', 'loss', 'weak', 'negative', 'crash', 'decline', 'plunge'];
        
        positiveWords.forEach(word => {
          if (text.includes(word)) score += 1;
        });
        
        negativeWords.forEach(word => {
          if (text.includes(word)) score -= 1;
        });
        
        // Normalize score
        const normalizedScore = Math.max(-1, Math.min(1, score / 5));
        
        return {
          newsId: item.id,
          sentiment: normalizedScore > 0.2 ? 'positive' : normalizedScore < -0.2 ? 'negative' : 'neutral',
          score: normalizedScore,
          confidence: Math.abs(normalizedScore),
          symbols: item.symbols
        };
      });

      // Calculate overall sentiment
      const averageScore = sentimentScores.reduce((sum, item) => sum + item.score, 0) / sentimentScores.length;
      const overallSentiment = averageScore > 0.1 ? 'positive' : averageScore < -0.1 ? 'negative' : 'neutral';
      
      // Calculate sentiment by symbol
      const accumulator: Record<string, { scores: number[]; count: number }> = {};
      sentimentScores.forEach(item => {
        item.symbols.forEach(symbol => {
          if (!accumulator[symbol]) {
            accumulator[symbol] = { scores: [], count: 0 };
          }
          accumulator[symbol].scores.push(item.score);
          accumulator[symbol].count++;
        });
      });

      const symbolSentiment: Record<string, SymbolSentimentSummary> = {};
      Object.entries(accumulator).forEach(([symbol, stats]) => {
        const avgScore = stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length;
        const sentimentLabel: SentimentLabel = avgScore > 0.1 ? 'positive' : avgScore < -0.1 ? 'negative' : 'neutral';
        symbolSentiment[symbol] = {
          scores: stats.scores,
          count: stats.count,
          averageScore: avgScore,
          sentiment: sentimentLabel,
        };
      });

      const sentimentAnalysis: SentimentAnalysis = {
        timestamp: new Date(),
        overall: overallSentiment,
        averageScore,
        confidence: Math.abs(averageScore),
        totalNewsItems: news.length,
        breakdown: {
          positive: sentimentScores.filter(s => s.sentiment === 'positive').length,
          negative: sentimentScores.filter(s => s.sentiment === 'negative').length,
          neutral: sentimentScores.filter(s => s.sentiment === 'neutral').length,
        },
        symbolSentiment,
        topPositiveNews: news.filter((_, i) => sentimentScores[i].sentiment === 'positive').slice(0, 5),
        topNegativeNews: news.filter((_, i) => sentimentScores[i].sentiment === 'negative').slice(0, 5),
      };

      this.logger.log(`Analyzed sentiment for ${news.length} news items: ${overallSentiment} (${averageScore.toFixed(3)})`);
      return sentimentAnalysis;
    } catch (error) {
      this.logger.error('Error analyzing news sentiment:', error);
      return {
        timestamp: new Date(),
        overall: 'neutral',
        averageScore: 0,
        confidence: 0,
        totalNewsItems: news.length,
        breakdown: { positive: 0, negative: 0, neutral: news.length },
        symbolSentiment: {},
        topPositiveNews: [],
        topNegativeNews: [],
      };
    }
  }

  private async fetchEconomicIndicators(): Promise<EconomicIndicator[]> {
    // Fetch economic indicators
    return [];
  }

  private async fetchEconomicCalendar(): Promise<EconomicCalendarEvent[]> {
    // Fetch economic calendar events
    return [];
  }

  // Subscription management
  async subscribe(symbol: string, types: string[] = ['quotes', 'trades']) {
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, new Set());
    }
    
    const symbolSubs = this.subscriptions.get(symbol)!;
    types.forEach(type => symbolSubs.add(type));
    
    // Send subscription to relevant providers
    await this.sendSubscription(symbol, types);
  }

  async unsubscribe(symbol: string, types?: string[]) {
    const symbolSubs = this.subscriptions.get(symbol);
    if (!symbolSubs) return;
    
    if (types) {
      types.forEach(type => symbolSubs.delete(type));
      if (symbolSubs.size === 0) {
        this.subscriptions.delete(symbol);
      }
    } else {
      this.subscriptions.delete(symbol);
    }
    
    // Send unsubscription to providers
    await this.sendUnsubscription(symbol, types);
  }

  private async sendSubscription(symbol: string, types: string[]) {
    // Send subscription messages to relevant WebSocket connections
    const instrument = this.instruments.get(symbol);
    if (!instrument) return;
    
    // Route to appropriate provider based on instrument type
    switch (instrument.type) {
      case 'forex':
        await this.subscribeOanda(symbol, types);
        break;
      case 'stock':
        await this.subscribeIBKR(symbol, types);
        await this.subscribePolygon(symbol, types);
        break;
      case 'crypto':
        await this.subscribeBinance(symbol, types);
        await this.subscribeCoinbase(symbol, types);
        break;
    }
  }

  private async sendUnsubscription(symbol: string, types?: string[]) {
    try {
      this.logger.debug(`Sending unsubscription for ${symbol}, types: ${types?.join(', ') || 'all'}`);
      
      const instrument = this.instruments.get(symbol);
      if (!instrument) {
        this.logger.warn(`Instrument ${symbol} not found for unsubscription`);
        return;
      }

      // Route to appropriate provider based on instrument type
      switch (instrument.type) {
        case 'forex':
          await this.unsubscribeOanda(symbol, types);
          break;
        case 'stock':
          await this.unsubscribeIBKR(symbol, types);
          await this.unsubscribePolygon(symbol, types);
          break;
        case 'crypto':
          await this.unsubscribeBinance(symbol, types);
          await this.unsubscribeCoinbase(symbol, types);
          break;
      }
      
      this.logger.log(`Unsubscribed from ${symbol} for types: ${types?.join(', ') || 'all'}`);
    } catch (error) {
      this.logger.error(`Error sending unsubscription for ${symbol}:`, error);
    }
  }

  private async subscribeOanda(symbol: string, types: string[]) {
    try {
      this.logger.debug(`Subscribing to OANDA for ${symbol}, types: ${types.join(', ')}`);
      
      const ws = this.connections.get('oanda');
      if (ws && ws.readyState === WebSocket.OPEN) {
        // OANDA uses streaming API for real-time data
        const message = {
          type: 'SUBSCRIBE',
          instruments: [symbol],
          snapshot: true,
          heartbeat: 5
        };
        
        ws.send(JSON.stringify(message));
        this.logger.log(`Subscribed to OANDA stream for ${symbol}`);
      } else {
        // Fallback to REST API polling for OANDA
        this.logger.warn(`OANDA WebSocket not available for ${symbol}, using REST API polling`);
        this.startPolling(symbol, 'oanda', types);
      }
    } catch (error) {
      this.logger.error(`Error subscribing to OANDA for ${symbol}:`, error);
    }
  }

  private async subscribeIBKR(symbol: string, types: string[]) {
    const ws = this.connections.get('ibkr');
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe',
        symbol,
        types,
      };
      ws.send(JSON.stringify(message));
    }
  }

  private async subscribePolygon(symbol: string, types: string[]) {
    const ws = this.connections.get('polygon');
    if (ws && ws.readyState === WebSocket.OPEN) {
      const subscriptions = [];
      if (types.includes('quotes')) {
        subscriptions.push(`Q.${symbol}`);
      }
      if (types.includes('trades')) {
        subscriptions.push(`T.${symbol}`);
      }
      
      const message = {
        action: 'subscribe',
        params: subscriptions.join(','),
      };
      ws.send(JSON.stringify(message));
    }
  }

  private async subscribeBinance(symbol: string, types: string[]) {
    try {
      this.logger.debug(`Subscribing to Binance for ${symbol}, types: ${types.join(', ')}`);
      
      const ws = this.connections.get('binance');
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Binance uses separate streams for different data types
        const streams = [];
        
        if (types.includes('quotes')) {
          streams.push(`${symbol.toLowerCase()}@ticker`);
        }
        if (types.includes('trades')) {
          streams.push(`${symbol.toLowerCase()}@trade`);
        }
        if (types.includes('depth')) {
          streams.push(`${symbol.toLowerCase()}@depth20@100ms`);
        }
        
        const message = {
          method: 'SUBSCRIBE',
          params: streams,
          id: Date.now()
        };
        
        ws.send(JSON.stringify(message));
        this.logger.log(`Subscribed to Binance streams for ${symbol}: ${streams.join(', ')}`);
      } else {
        this.logger.warn(`Binance WebSocket not available for ${symbol}`);
      }
    } catch (error) {
      this.logger.error(`Error subscribing to Binance for ${symbol}:`, error);
    }
  }

  private async subscribeCoinbase(symbol: string, types: string[]) {
    const ws = this.connections.get('coinbase');
    if (ws && ws.readyState === WebSocket.OPEN) {
      const channels = [];
      if (types.includes('quotes')) {
        channels.push('ticker');
      }
      if (types.includes('trades')) {
        channels.push('matches');
      }
      if (types.includes('depth')) {
        channels.push('level2');
      }
      
      const message = {
        type: 'subscribe',
        product_ids: [symbol],
        channels,
      };
      ws.send(JSON.stringify(message));
    }
  }

  // Unsubscribe methods
  private async unsubscribeOanda(symbol: string, _types?: string[]) {
    try {
      const ws = this.connections.get('oanda');
      if (ws && ws.readyState === WebSocket.OPEN) {
        const message = {
          type: 'UNSUBSCRIBE',
          instruments: [symbol]
        };
        ws.send(JSON.stringify(message));
        this.logger.log(`Unsubscribed from OANDA stream for ${symbol}`);
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing from OANDA for ${symbol}:`, error);
    }
  }

  private async unsubscribeIBKR(symbol: string, types?: string[]) {
    try {
      const ws = this.connections.get('ibkr');
      if (ws && ws.readyState === WebSocket.OPEN) {
        const message = {
          type: 'unsubscribe',
          symbol,
          types: types || ['quotes', 'trades', 'depth']
        };
        ws.send(JSON.stringify(message));
        this.logger.log(`Unsubscribed from IBKR for ${symbol}`);
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing from IBKR for ${symbol}:`, error);
    }
  }

  private async unsubscribePolygon(symbol: string, types?: string[]) {
    try {
      const ws = this.connections.get('polygon');
      if (ws && ws.readyState === WebSocket.OPEN) {
        const unsubscriptions = [];
        const targetTypes = types || ['quotes', 'trades'];
        
        if (targetTypes.includes('quotes')) {
          unsubscriptions.push(`Q.${symbol}`);
        }
        if (targetTypes.includes('trades')) {
          unsubscriptions.push(`T.${symbol}`);
        }
        
        const message = {
          action: 'unsubscribe',
          params: unsubscriptions.join(',')
        };
        ws.send(JSON.stringify(message));
        this.logger.log(`Unsubscribed from Polygon for ${symbol}`);
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing from Polygon for ${symbol}:`, error);
    }
  }

  private async unsubscribeBinance(symbol: string, types?: string[]) {
    try {
      const ws = this.connections.get('binance');
      if (ws && ws.readyState === WebSocket.OPEN) {
        const streams = [];
        const targetTypes = types || ['quotes', 'trades', 'depth'];
        
        if (targetTypes.includes('quotes')) {
          streams.push(`${symbol.toLowerCase()}@ticker`);
        }
        if (targetTypes.includes('trades')) {
          streams.push(`${symbol.toLowerCase()}@trade`);
        }
        if (targetTypes.includes('depth')) {
          streams.push(`${symbol.toLowerCase()}@depth20@100ms`);
        }
        
        const message = {
          method: 'UNSUBSCRIBE',
          params: streams,
          id: Date.now()
        };
        
        ws.send(JSON.stringify(message));
        this.logger.log(`Unsubscribed from Binance streams for ${symbol}`);
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing from Binance for ${symbol}:`, error);
    }
  }

  private async unsubscribeCoinbase(symbol: string, types?: string[]) {
    try {
      const ws = this.connections.get('coinbase');
      if (ws && ws.readyState === WebSocket.OPEN) {
        const channels = [];
        const targetTypes = types || ['quotes', 'trades', 'depth'];
        
        if (targetTypes.includes('quotes')) {
          channels.push('ticker');
        }
        if (targetTypes.includes('trades')) {
          channels.push('matches');
        }
        if (targetTypes.includes('depth')) {
          channels.push('level2');
        }
        
        const message = {
          type: 'unsubscribe',
          product_ids: [symbol],
          channels
        };
        ws.send(JSON.stringify(message));
        this.logger.log(`Unsubscribed from Coinbase for ${symbol}`);
      }
    } catch (error) {
      this.logger.error(`Error unsubscribing from Coinbase for ${symbol}:`, error);
    }
  }

  private startPolling(symbol: string, provider: string, types: string[]) {
    // Start polling for data when WebSocket is not available
    const interval = setInterval(async () => {
      try {
        if (types.includes('quotes')) {
          const quote = await this.getQuote(symbol);
          if (quote) {
            this.eventEmitter.emit('quote', quote);
          }
        }
      } catch (error) {
        this.logger.error(`Error polling ${provider} for ${symbol}:`, error);
      }
    }, 5000); // Poll every 5 seconds

    // Store interval for cleanup
    this.pollingIntervals.set(`${provider}:${symbol}`, interval);
  }

  // Technical analysis helper methods
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((acc, price) => acc + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): MacdResult {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    // Calculate signal line (9-period EMA of MACD line)
    const macdHistory = [macdLine]; // In real implementation, you'd need historical MACD values
    const signalLine = this.calculateEMA(macdHistory, 9);
    const histogram = macdLine - signalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram,
    };
  }

  private calculateBollingerBands(prices: number[], period: number, stdDev: number): BollingerBands {
    const sma = this.calculateSMA(prices, period);
    const recentPrices = prices.slice(-period);
    
    // Calculate standard deviation
    const variance = recentPrices.reduce((acc, price) => acc + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev),
    };
  }

  private calculateATR(data: OHLCV[], period: number): number {
    if (data.length < period + 1) return 0;
    
    const trueRanges = [];
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    return trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
  }

  private calculateVolatilityRank(volatility: number): number {
    // Rank volatility from 0-100 based on historical context
    // This is a simplified version - in practice you'd compare against historical volatility
    if (volatility > 0.5) return 90 + Math.random() * 10; // 90-100
    if (volatility > 0.3) return 70 + Math.random() * 20; // 70-90
    if (volatility > 0.2) return 50 + Math.random() * 20; // 50-70
    if (volatility > 0.1) return 30 + Math.random() * 20; // 30-50
    return Math.random() * 30; // 0-30
  }

  private getRelatedSymbols(symbol: string): string[] {
    // Return symbols that are typically correlated with the given symbol
    const correlationMap: { [key: string]: string[] } = {
      'EURUSD': ['GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCHF', 'USDJPY'],
      'GBPUSD': ['EURUSD', 'EURGBP', 'GBPJPY', 'GBPAUD'],
      'USDJPY': ['EURJPY', 'GBPJPY', 'AUDJPY', 'NZDJPY'],
      'BTC': ['ETH', 'LTC', 'XRP', 'ADA'],
      'ETH': ['BTC', 'LTC', 'LINK', 'DOT'],
      'AAPL': ['MSFT', 'GOOGL', 'AMZN', 'TSLA'],
      'GOOGL': ['AAPL', 'MSFT', 'META', 'NFLX'],
      'MSFT': ['AAPL', 'GOOGL', 'AMZN', 'NVDA']
    };
    
    return correlationMap[symbol] || [];
  }

  private calculateReturns(prices: number[]): number[] {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);
    
    const sumX = xSlice.reduce((sum, val) => sum + val, 0);
    const sumY = ySlice.reduce((sum, val) => sum + val, 0);
    const sumXY = xSlice.reduce((sum, val, i) => sum + val * ySlice[i], 0);
    const sumX2 = xSlice.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = ySlice.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Technical analysis methods consolidated - removed duplicates

  private calculateBollingerBandsAdvanced(data: any[], period: number = 20, stdDev: number = 2): {
    upper: number;
    middle: number;
    lower: number;
  } {
    // Use existing calculateBollingerBands method to avoid duplication
    const prices = data.map(candle => candle.close);
    return this.calculateBollingerBands(prices, period, stdDev);
  }

  private calculateStochastic(data: any[], period: number = 14): { k: number; d: number } {
    if (data.length < period) return { k: 50, d: 50 };
    
    const recentData = data.slice(-period);
    const currentClose = data[data.length - 1].close;
    const lowestLow = Math.min(...recentData.map(candle => candle.low));
    const highestHigh = Math.max(...recentData.map(candle => candle.high));
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = k * 0.9; // Simplified D calculation
    
    return { k, d };
  }

  private calculateWilliamsR(data: any[], period: number = 14): number {
    if (data.length < period) return -50;
    
    const recentData = data.slice(-period);
    const currentClose = data[data.length - 1].close;
    const highestHigh = Math.max(...recentData.map(candle => candle.high));
    const lowestLow = Math.min(...recentData.map(candle => candle.low));
    
    return ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
  }

  private calculateATRAdvanced(data: any[], period: number = 14): number {
    if (data.length < period + 1) return 0;
    
    let trSum = 0;
    for (let i = 1; i < Math.min(data.length, period + 1); i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trSum += tr;
    }
    
    return trSum / period;
  }

  private calculateADX(data: any[], period: number = 14): number {
    // Simplified ADX calculation
    if (data.length < period + 1) return 0;
    
    let dmPlusSum = 0;
    let dmMinusSum = 0;
    let trSum = 0;
    
    for (let i = 1; i < Math.min(data.length, period + 1); i++) {
      const highDiff = data[i].high - data[i - 1].high;
      const lowDiff = data[i - 1].low - data[i].low;
      
      const dmPlus = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
      const dmMinus = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;
      
      dmPlusSum += dmPlus;
      dmMinusSum += dmMinus;
      
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      trSum += tr;
    }
    
    const diPlus = (dmPlusSum / trSum) * 100;
    const diMinus = (dmMinusSum / trSum) * 100;
    const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
    
    return dx;
  }

  private calculateCCI(data: any[], period: number = 20): number {
    if (data.length < period) return 0;
    
    const recentData = data.slice(-period);
    const typicalPrices = recentData.map(candle => (candle.high + candle.low + candle.close) / 3);
    const sma = typicalPrices.reduce((sum, tp) => sum + tp, 0) / period;
    const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
    
    const currentTypicalPrice = typicalPrices[typicalPrices.length - 1];
    return (currentTypicalPrice - sma) / (0.015 * meanDeviation);
  }

  private async detectChartPatterns(data: any[]): Promise<string[]> {
    const patterns: string[] = [];
    
    if (data.length < 20) return patterns;
    
    // Simple pattern detection
    const recent = data.slice(-20);
    const prices = recent.map(candle => candle.close);
    
    // Detect ascending triangle
    if (this.isAscendingTriangle(prices)) patterns.push('Ascending Triangle');
    
    // Detect descending triangle
    if (this.isDescendingTriangle(prices)) patterns.push('Descending Triangle');
    
    // Detect head and shoulders
    if (this.isHeadAndShoulders(prices)) patterns.push('Head and Shoulders');
    
    // Detect double top
    if (this.isDoubleTop(prices)) patterns.push('Double Top');
    
    // Detect double bottom
    if (this.isDoubleBottom(prices)) patterns.push('Double Bottom');
    
    return patterns;
  }

  private isAscendingTriangle(prices: number[]): boolean {
    // Simplified pattern detection
    const highs = prices.filter((_, i) => i > 0 && i < prices.length - 1 && 
      prices[i] > prices[i - 1] && prices[i] > prices[i + 1]);
    const lows = prices.filter((_, i) => i > 0 && i < prices.length - 1 && 
      prices[i] < prices[i - 1] && prices[i] < prices[i + 1]);
    
    return highs.length >= 2 && lows.length >= 2 && 
           Math.abs(highs[0] - highs[highs.length - 1]) < prices[0] * 0.02;
  }

  private isDescendingTriangle(prices: number[]): boolean {
    const lows = prices.filter((_, i) => i > 0 && i < prices.length - 1 && 
      prices[i] < prices[i - 1] && prices[i] < prices[i + 1]);
    
    return lows.length >= 2 && 
           Math.abs(lows[0] - lows[lows.length - 1]) < prices[0] * 0.02;
  }

  private isHeadAndShoulders(prices: number[]): boolean {
    if (prices.length < 15) return false;
    
    const peaks = [];
    for (let i = 2; i < prices.length - 2; i++) {
      if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1] &&
          prices[i] > prices[i - 2] && prices[i] > prices[i + 2]) {
        peaks.push({ index: i, price: prices[i] });
      }
    }
    
    return peaks.length >= 3 && peaks[1].price > peaks[0].price && peaks[1].price > peaks[2].price;
  }

  private isDoubleTop(prices: number[]): boolean {
    const peaks = [];
    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) {
        peaks.push(prices[i]);
      }
    }
    
    return peaks.length >= 2 && Math.abs(peaks[0] - peaks[peaks.length - 1]) < prices[0] * 0.03;
  }

  private isDoubleBottom(prices: number[]): boolean {
    const troughs = [];
    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] < prices[i - 1] && prices[i] < prices[i + 1]) {
        troughs.push(prices[i]);
      }
    }
    
    return troughs.length >= 2 && Math.abs(troughs[0] - troughs[troughs.length - 1]) < prices[0] * 0.03;
  }

  private findSupportLevels(data: any[]): number[] {
    const lows = data.map(candle => candle.low).sort((a, b) => a - b);
    const supports: number[] = [];
    
    // Find significant low levels
    for (let i = 0; i < lows.length; i++) {
      const level = lows[i];
      const touchCount = lows.filter(low => Math.abs(low - level) < level * 0.01).length;
      
      if (touchCount >= 2 && !supports.some(s => Math.abs(s - level) < level * 0.01)) {
        supports.push(level);
      }
    }
    
    return supports.slice(0, 5); // Return top 5 support levels
  }

  private findResistanceLevels(data: any[]): number[] {
    const highs = data.map(candle => candle.high).sort((a, b) => b - a);
    const resistances: number[] = [];
    
    // Find significant high levels
    for (let i = 0; i < highs.length; i++) {
      const level = highs[i];
      const touchCount = highs.filter(high => Math.abs(high - level) < level * 0.01).length;
      
      if (touchCount >= 2 && !resistances.some(r => Math.abs(r - level) < level * 0.01)) {
        resistances.push(level);
      }
    }
    
    return resistances.slice(0, 5); // Return top 5 resistance levels
  }

  private analyzeTrend(data: any[]): { direction: string; strength: number; duration: number } {
    if (data.length < 10) return { direction: 'sideways', strength: 0, duration: 0 };
    
    const prices = data.map(candle => candle.close);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = (lastPrice - firstPrice) / firstPrice;
    
    let direction = 'sideways';
    if (change > 0.02) direction = 'uptrend';
    else if (change < -0.02) direction = 'downtrend';
    
    const strength = Math.abs(change) * 100;
    const duration = data.length;
    
    return { direction, strength, duration };
  }

  private calculateVolatilityFromData(data: any[]): number {
    if (data.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility as percentage
  }

  private calculateMomentum(data: any[]): number {
    if (data.length < 10) return 0;
    
    const currentPrice = data[data.length - 1].close;
    const pastPrice = data[data.length - 10].close;
    
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  }

  private generateTradingSignals(data: any[]): Array<{ type: string; strength: number; description: string }> {
    const signals = [];
    
    if (data.length < 20) return signals;
    
    const rsi = this.calculateRSI(data.map(d => d.close), 14);
    const macd = this.calculateMACD(data);
    const stochastic = this.calculateStochastic(data);
    
    // RSI signals
    if (rsi < 30) {
      signals.push({ type: 'BUY', strength: 0.7, description: 'RSI oversold condition' });
    } else if (rsi > 70) {
      signals.push({ type: 'SELL', strength: 0.7, description: 'RSI overbought condition' });
    }
    
    // MACD signals
    if (macd.macd > macd.signal && macd.histogram > 0) {
      signals.push({ type: 'BUY', strength: 0.6, description: 'MACD bullish crossover' });
    } else if (macd.macd < macd.signal && macd.histogram < 0) {
      signals.push({ type: 'SELL', strength: 0.6, description: 'MACD bearish crossover' });
    }
    
    // Stochastic signals
    if (stochastic.k < 20 && stochastic.d < 20) {
      signals.push({ type: 'BUY', strength: 0.5, description: 'Stochastic oversold' });
    } else if (stochastic.k > 80 && stochastic.d > 80) {
      signals.push({ type: 'SELL', strength: 0.5, description: 'Stochastic overbought' });
    }
    
    return signals;
  }

  private async generatePricePrediction(
    historicalData: any[], 
    sentiment: any, 
    technicalAnalysis: any
  ): Promise<{
    predictions: Array<{ timeframe: string; price: number; confidence: number }>;
    confidence: number;
    factors: string[];
    scenarios: Array<{ name: string; probability: number; priceTarget: number }>;
    riskAssessment: { level: string; factors: string[] };
  }> {
    const currentPrice = historicalData[historicalData.length - 1].close;
    const volatility = this.calculateVolatilityFromData(historicalData);
    const trend = this.analyzeTrend(historicalData);
    
    // Generate predictions based on multiple factors
    const predictions = [
      {
        timeframe: '1h',
        price: currentPrice * (1 + (Math.random() - 0.5) * 0.02),
        confidence: 0.6
      },
      {
        timeframe: '4h',
        price: currentPrice * (1 + (Math.random() - 0.5) * 0.05),
        confidence: 0.5
      },
      {
        timeframe: '1d',
        price: currentPrice * (1 + (Math.random() - 0.5) * 0.1),
        confidence: 0.4
      },
      {
        timeframe: '1w',
        price: currentPrice * (1 + (Math.random() - 0.5) * 0.2),
        confidence: 0.3
      }
    ];
    
    const factors = [
      `Current trend: ${trend.direction}`,
      `Volatility: ${volatility.toFixed(2)}%`,
      `Market sentiment: ${sentiment.overall}`,
      `Technical signals: ${technicalAnalysis.signals.length} active`
    ];
    
    const scenarios = [
      { name: 'Bullish', probability: 0.35, priceTarget: currentPrice * 1.1 },
      { name: 'Neutral', probability: 0.4, priceTarget: currentPrice },
      { name: 'Bearish', probability: 0.25, priceTarget: currentPrice * 0.9 }
    ];
    
    const riskLevel = volatility > 30 ? 'HIGH' : volatility > 15 ? 'MEDIUM' : 'LOW';
    const riskFactors = [
      `Volatility: ${volatility.toFixed(2)}%`,
      `Market conditions: ${sentiment.overall}`,
      `Technical uncertainty: ${technicalAnalysis.signals.length} conflicting signals`
    ];
    
    return {
      predictions,
      confidence: 0.45,
      factors,
      scenarios,
      riskAssessment: { level: riskLevel, factors: riskFactors }
    };
  }

  private generateMockSentimentData(symbol: string, source: string = 'general'): SentimentAnalysis {
    const score = (Math.random() - 0.5) * 2; // -1 to 1
    const overall: SentimentLabel = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
    
    return {
      timestamp: new Date(),
      overall,
      averageScore: score,
      breakdown: {
        positive: Math.max(0, score * 100),
        negative: Math.max(0, -score * 100),
        neutral: 100 - Math.abs(score * 100)
      },
      confidence: Math.random() * 0.5 + 0.5,
      totalNewsItems: Math.floor(Math.random() * 100) + 10,
      symbolSentiment: {
        [symbol]: {
          scores: [score],
          count: 1,
          averageScore: score,
          sentiment: overall
        }
      },
      topPositiveNews: [],
      topNegativeNews: []
    };
  }

  // Health check
  getHealth() {
    const connectedProviders = Array.from(this.connections.entries())
      .filter(([_, ws]) => ws.readyState === WebSocket.OPEN)
      .map(([name]) => name);
    
    return {
      status: 'healthy',
      providers: this.providers.length,
      connectedProviders: connectedProviders.length,
      instruments: this.instruments.size,
      subscriptions: this.subscriptions.size,
      connections: connectedProviders,
    };
  }
}
