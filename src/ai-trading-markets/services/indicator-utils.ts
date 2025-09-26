import { Decimal } from '@prisma/client/runtime/library';

export interface OhlcvCandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | Decimal;
}

function assertDataLength(data: OhlcvCandle[], period: number): void {
  if (period <= 0) {
    throw new Error('Period must be greater than zero');
  }
  if (data.length < period) {
    throw new Error(`Not enough data points. Required: ${period}, received: ${data.length}`);
  }
}

export function calculateSimpleMovingAverageSeries(data: OhlcvCandle[], period: number): number[] {
  assertDataLength(data, period);

  const sma: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const window = data.slice(i - period + 1, i + 1);
    const sum = window.reduce((acc, candle) => acc + candle.close, 0);
    sma.push(sum / period);
  }
  return sma;
}

export function calculateSimpleMovingAverage(data: OhlcvCandle[], period: number): number {
  const series = calculateSimpleMovingAverageSeries(data, period);
  return series.length ? series[series.length - 1] : 0;
}

export function calculateExponentialMovingAverageSeries(data: OhlcvCandle[], period: number): number[] {
  assertDataLength(data, period);
  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  // Seed with SMA
  const smaSeed = calculateSimpleMovingAverageSeries(data.slice(0, period), period)[0];
  ema.push(smaSeed);

  for (let i = period; i < data.length; i++) {
    const currentPrice = data[i].close;
    const prevEma = ema[ema.length - 1];
    ema.push((currentPrice - prevEma) * multiplier + prevEma);
  }

  return ema;
}

export function calculateExponentialMovingAverage(data: OhlcvCandle[], period: number): number {
  const series = calculateExponentialMovingAverageSeries(data, period);
  return series.length ? series[series.length - 1] : 0;
}

export function calculateRelativeStrengthIndexSeries(data: OhlcvCandle[], period: number): number[] {
  assertDataLength(data, period + 1);

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const rsi: number[] = [];
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((acc, gain) => acc + gain, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((acc, loss) => acc + loss, 0) / period;
    const rs = avgLoss === 0 ? Number.MAX_SAFE_INTEGER : avgGain / avgLoss;
    const value = 100 - 100 / (1 + rs);
    rsi.push(value);
  }

  return rsi;
}

export function calculateRelativeStrengthIndex(data: OhlcvCandle[], period: number): number {
  const series = calculateRelativeStrengthIndexSeries(data, period);
  return series.length ? series[series.length - 1] : 50;
}

export function calculateAverageTrueRangeSeries(data: OhlcvCandle[], period: number): number[] {
  assertDataLength(data, period + 1);

  const trueRanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const prev = data[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close),
    );
    trueRanges.push(tr);
  }

  const atr: number[] = [];
  for (let i = period - 1; i < trueRanges.length; i++) {
    const window = trueRanges.slice(i - period + 1, i + 1);
    const avg = window.reduce((acc, value) => acc + value, 0) / period;
    atr.push(avg);
  }

  return atr;
}

export function calculateAverageTrueRange(data: OhlcvCandle[], period: number): number {
  const series = calculateAverageTrueRangeSeries(data, period);
  return series.length ? series[series.length - 1] : 0;
}

export interface MacdSeries {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function calculateMACDSeries(
  data: OhlcvCandle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdSeries {
  assertDataLength(data, slowPeriod + signalPeriod);

  const fastEma = calculateExponentialMovingAverageSeries(data, fastPeriod);
  const slowEma = calculateExponentialMovingAverageSeries(data, slowPeriod);

  const macd: number[] = [];
  for (let i = 0; i < slowEma.length; i++) {
    const fastIndex = fastEma.length - slowEma.length + i;
    macd.push(fastEma[fastIndex] - slowEma[i]);
  }

  const macdCandles = macd.map((value, idx) => ({
    timestamp: data[data.length - macd.length + idx].timestamp,
    open: value,
    high: value,
    low: value,
    close: value,
  }));

  const signal = calculateExponentialMovingAverageSeries(macdCandles, signalPeriod).slice(-macd.length);
  const histogram = macd.map((value, idx) => value - signal[idx]);

  return { macd, signal, histogram };
}
