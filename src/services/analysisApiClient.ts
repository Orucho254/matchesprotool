import {
  DerivMarketItem,
  DigitPredictionSignal,
  EvenOddStrategyAnalysis,
  SmcRiseFallStrategyAnalysis,
  OverLevel,
  OverLevelStrategy,
  ToolType,
} from '../types';
import { authService } from './authService';

const envApiUrl =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env.VITE_API_URL
    : '';
const API_BASE = (envApiUrl || '').replace(/\/+$/, '');

class AnalysisApiClient {
  private getHeaders(): HeadersInit {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Securely requests proprietary digit prediction signal from the backend
   */
  public async getDigitSignal(
    market: {
      displayName?: string;
      prediction: any;
      stats?: DerivMarketItem['stats'];
      recentDigits?: number[];
      recentPrices?: number[];
      lastDigit?: number;
      priceDelta?: number;
    },
    activeToolType?: ToolType
  ): Promise<DigitPredictionSignal | null> {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/digit-signal`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ market, activeToolType }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.signal || null;
    } catch {
      return null;
    }
  }

  /**
   * Securely requests Even/Odd two-part strategy analysis from the backend
   */
  public async getEvenOddAnalysis(recentDigits: number[]): Promise<EvenOddStrategyAnalysis | null> {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/even-odd`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ recentDigits }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.analysis || null;
    } catch {
      return null;
    }
  }

  /**
   * Securely requests SMC 1m strategy analysis from the backend
   */
  public async getSmcAnalysis(
    candles: any[],
    currentPrice: number,
    pipSize: number = 2
  ): Promise<SmcRiseFallStrategyAnalysis | null> {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/smc`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ candles, currentPrice, pipSize }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.analysis || null;
    } catch {
      return null;
    }
  }

  /**
   * Securely requests Over 1-8 strategy analysis from the backend
   */
  public async getOverAnalysis(
    level: OverLevel,
    digits: number[]
  ): Promise<OverLevelStrategy | null> {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/over-under`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ level, digits }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.analysis || null;
    } catch {
      return null;
    }
  }

  /**
   * Securely requests batched predictions for multiple markets
   */
  public async getBatchPredictions(
    items: any[]
  ): Promise<Record<string, { prediction: any; signal: DigitPredictionSignal }> | null> {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/batch-signals`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ items }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.results || null;
    } catch {
      return null;
    }
  }
}

export const analysisApiClient = new AnalysisApiClient();
