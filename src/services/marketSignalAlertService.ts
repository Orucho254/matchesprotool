import {
  DerivMarketItem,
  MarketContractType,
  MarketSignalAlert,
  OverLevel,
  ToolType,
} from '../types';
import { computePrediction } from '../data/markets';
import { soundService } from '../utils/audio';

type AlertListener = (alert: MarketSignalAlert, allActive: MarketSignalAlert[]) => void;
type ActiveAlertsListener = (alerts: MarketSignalAlert[]) => void;

class MarketSignalAlertService {
  private activeAlerts: Map<string, MarketSignalAlert> = new Map(); // key: `${symbol}_${contractType}`
  private alertListeners: Set<AlertListener> = new Set();
  private activeAlertsListeners: Set<ActiveAlertsListener> = new Set();
  private dismissedAlertKeys: Map<string, number> = new Map(); // key -> dismissTimestamp
  private latestStrongestAlert: MarketSignalAlert | null = null;
  private currentTool: ToolType = 'OVER_UNDER';
  private soundEnabled: boolean = true;
  private autoPopupEnabled: boolean = false;

  public setCurrentTool(toolType: ToolType) {
    if (this.currentTool !== toolType) {
      this.currentTool = toolType;
      // Filter active alerts to only those that match the newly open tool
      const validContractType = this.toolToContractType(toolType);
      if (validContractType) {
        for (const [key, alert] of Array.from(this.activeAlerts.entries())) {
          if (alert.contractType !== validContractType) {
            this.activeAlerts.delete(key);
          }
        }
      }
      this.latestStrongestAlert = this.getAllActiveAlerts()[0] || null;
      this.notifyActiveAlertsListeners();
    }
  }

  public getCurrentTool(): ToolType {
    return this.currentTool;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public setAutoPopupEnabled(enabled: boolean) {
    this.autoPopupEnabled = enabled;
  }

  public isAutoPopupEnabled(): boolean {
    return this.autoPopupEnabled;
  }

  public onNewAlert(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  public onActiveAlertsChange(listener: ActiveAlertsListener): () => void {
    this.activeAlertsListeners.add(listener);
    listener(this.getAllActiveAlerts());
    return () => this.activeAlertsListeners.delete(listener);
  }

  public getAllActiveAlerts(): MarketSignalAlert[] {
    const validContractType = this.toolToContractType(this.currentTool);
    let alerts = Array.from(this.activeAlerts.values());

    if (validContractType) {
      alerts = alerts.filter((a) => a.contractType === validContractType);
    }

    // Sort descending by confidence so the most favourable and strongest signals are first
    return alerts.sort((a, b) => b.confidence - a.confidence);
  }

  public getStrongestAlert(): MarketSignalAlert | null {
    return this.latestStrongestAlert;
  }

  public dismissAlert(alertId: string) {
    for (const [key, alert] of Array.from(this.activeAlerts.entries())) {
      if (alert.id === alertId) {
        this.dismissedAlertKeys.set(key, Date.now());
        this.activeAlerts.delete(key);
        break;
      }
    }
    this.notifyActiveAlertsListeners();
  }

  public clearAllDismissals() {
    this.dismissedAlertKeys.clear();
  }

  private toolToContractType(toolType: ToolType): MarketContractType | null {
    switch (toolType) {
      case 'OVER_UNDER':
        return 'OVER_UNDER';
      case 'RISE_FALL':
        return 'RISE_FALL';
      case 'EVEN_ODD':
        return 'EVEN_ODD';
      case 'MATCHES':
        return 'MATCHES';
      case 'SCANNER':
      default:
        return null; // All contracts valid for SCANNER
    }
  }

  private contractTypeToLabel(contractType: MarketContractType): 'Even / Odd' | 'Matches / Differs' | 'Over / Under' | 'Rise / Fall' {
    switch (contractType) {
      case 'OVER_UNDER':
        return 'Over / Under';
      case 'RISE_FALL':
        return 'Rise / Fall';
      case 'EVEN_ODD':
        return 'Even / Odd';
      case 'MATCHES':
        return 'Matches / Differs';
    }
  }

  /**
   * Continuous analysis restricted strictly to the currently open market/tool.
   * For example, if user is analysing Over/Under, only Over/Under signals are generated.
   * If analysing Rise/Fall, only Rise/Fall signals are generated.
   */
  public analyzeAllMarkets(
    markets: DerivMarketItem[],
    currentTool?: ToolType,
    preferredOverLevel?: OverLevel | null
  ): {
    newAlertTriggered: MarketSignalAlert | null;
    allActiveAlerts: MarketSignalAlert[];
    strongerOpportunityDetected: boolean;
  } {
    if (currentTool) {
      this.currentTool = currentTool;
    }

    if (!markets || markets.length === 0) {
      return { newAlertTriggered: null, allActiveAlerts: [], strongerOpportunityDetected: false };
    }

    const currentActiveKeys = new Set<string>();
    let triggeredAlert: MarketSignalAlert | null = null;
    let strongerOpportunityDetected = false;
    const now = Date.now();
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Restrict scan targets strictly to the currently open market tool
    const targetContractType = this.toolToContractType(this.currentTool);
    const contractsToScan: { type: MarketContractType; label: 'Even / Odd' | 'Matches / Differs' | 'Over / Under' | 'Rise / Fall' }[] = [];

    if (targetContractType) {
      contractsToScan.push({
        type: targetContractType,
        label: this.contractTypeToLabel(targetContractType),
      });
    } else {
      // For general scanner, scan all 4 contracts
      contractsToScan.push(
        { type: 'OVER_UNDER', label: 'Over / Under' },
        { type: 'RISE_FALL', label: 'Rise / Fall' },
        { type: 'EVEN_ODD', label: 'Even / Odd' },
        { type: 'MATCHES', label: 'Matches / Differs' }
      );
    }

    for (const market of markets) {
      // Minimum tick threshold for statistical robustness
      if (!market.recentDigits || market.recentDigits.length < 15) {
        continue;
      }

      for (const contract of contractsToScan) {
        const prediction = computePrediction(
          contract.type,
          market.recentDigits,
          market.recentPrices,
          market.stats,
          preferredOverLevel,
          market.candlestickData1m,
          market.symbol,
          market.pipSize
        );

        // Filter: ONLY the most favourable and strongest signals meeting strategy conditions
        const isQualified = prediction.isTradeReady && prediction.confidence >= 85;

        // For Over/Under: strictly require the Over 1-8 Strategy conditions to be met
        const isOverUnderQualified =
          contract.type !== 'OVER_UNDER' ||
          (prediction.overStrategy ? prediction.overStrategy.isAllConditionsMet : isQualified);

        // For Even/Odd: strictly require the Even/Odd quantitative strategy conditions to be met
        const isEvenOddQualified =
          contract.type !== 'EVEN_ODD' ||
          (prediction.evenOddStrategy ? prediction.evenOddStrategy.isAllConditionsMet : isQualified);

        // For Rise/Fall: strictly require the SMC 1-min Supply/Demand & confirmation bar rules to be met
        const isRiseFallQualified =
          contract.type !== 'RISE_FALL' ||
          (prediction.smcStrategy ? prediction.smcStrategy.isAllConditionsMet : isQualified);

        if (isQualified && isOverUnderQualified && isEvenOddQualified && isRiseFallQualified) {
          const key = `${market.symbol}_${contract.type}`;
          currentActiveKeys.add(key);

          // Build candidate signal payload
          let signalDetected = prediction.primarySignal;
          let recommendedDirection = prediction.recommendedTrade || prediction.primarySignal;

          if (contract.type === 'OVER_UNDER' && prediction.overStrategy) {
            signalDetected = `OVER ${prediction.overStrategy.level} STRATEGY VERIFIED`;
            recommendedDirection = `OVER ${prediction.overStrategy.level}`;
          } else if (contract.type === 'EVEN_ODD' && prediction.evenOddStrategy) {
            signalDetected = `EVEN/ODD STRATEGY VERIFIED (${prediction.evenOddStrategy.targetDirection})`;
            recommendedDirection = prediction.evenOddStrategy.recommendedTrade;
          } else if (contract.type === 'RISE_FALL' && prediction.smcStrategy) {
            signalDetected = `BABYOIL SPEEDBOT POI (${prediction.smcStrategy.trend1m})`;
            recommendedDirection = `TRADE ${prediction.smcStrategy.recommendedTrade}`;
          } else if (contract.type === 'MATCHES') {
            signalDetected = prediction.primarySignal.startsWith('MATCH')
              ? `CONSECUTIVE MATCH RESONANCE`
              : `COLD DIGIT DECAY (DIFFERS)`;
            recommendedDirection = prediction.recommendedTrade;
          } else if (contract.type === 'RISE_FALL') {
            signalDetected = `TICK MOMENTUM ${prediction.primarySignal}`;
            recommendedDirection = prediction.primarySignal === 'RISE' ? 'BUY CALL (RISE)' : 'BUY PUT (FALL)';
          }

          const existingAlert = this.activeAlerts.get(key);
          const alertId = existingAlert ? existingAlert.id : `${market.symbol}-${contract.type}-${now}`;

          const updatedAlert: MarketSignalAlert = {
            id: alertId,
            marketSymbol: market.symbol,
            marketDisplayName: market.displayName,
            marketCategory: market.category,
            contractType: contract.type,
            contractTypeLabel: contract.label,
            signalDetected,
            recommendedDirection,
            confidence: prediction.confidence,
            signalStrength: prediction.confidence >= 92 ? 'VERY_STRONG' : 'STRONG',
            briefReason: prediction.reasoning,
            lastDigit: market.lastDigit,
            currentPrice: market.currentPrice,
            targetDigit: prediction.targetDigit,
            timestamp: existingAlert ? existingAlert.timestamp : now,
            timeFormatted,
          };

          // Check if newly discovered or superior to previous top opportunity
          const isNewlyFormed = !existingAlert;
          const dismissedAt = this.dismissedAlertKeys.get(key);
          const isDismissCooldown = dismissedAt && now - dismissedAt < 30000;

          const currentTopConfidence = this.latestStrongestAlert ? this.latestStrongestAlert.confidence : 0;
          const isSuperiorOpportunity =
            this.latestStrongestAlert &&
            this.latestStrongestAlert.marketSymbol !== market.symbol &&
            updatedAlert.confidence > currentTopConfidence + 2;

          this.activeAlerts.set(key, updatedAlert);

          if ((isNewlyFormed && !isDismissCooldown) || isSuperiorOpportunity) {
            if (!triggeredAlert || updatedAlert.confidence > triggeredAlert.confidence) {
              triggeredAlert = updatedAlert;
              if (isSuperiorOpportunity) {
                strongerOpportunityDetected = true;
              }
            }
          }
        }
      }
    }

    // Prune stale alerts that no longer meet criteria or are outside open tool
    for (const [key, alert] of Array.from(this.activeAlerts.entries())) {
      if (!currentActiveKeys.has(key)) {
        this.activeAlerts.delete(key);
      } else if (targetContractType && alert.contractType !== targetContractType) {
        this.activeAlerts.delete(key);
      }
    }

    const allActive = this.getAllActiveAlerts();
    this.latestStrongestAlert = allActive[0] || null;

    // Trigger alert listeners if a new or stronger opportunity popped up
    if (triggeredAlert && this.autoPopupEnabled) {
      if (this.soundEnabled) {
        soundService.playSignalAlert();
      }
      this.alertListeners.forEach((listener) => listener(triggeredAlert!, allActive));
    }

    this.notifyActiveAlertsListeners();

    return {
      newAlertTriggered: triggeredAlert,
      allActiveAlerts: allActive,
      strongerOpportunityDetected,
    };
  }

  private notifyActiveAlertsListeners() {
    const allActive = this.getAllActiveAlerts();
    this.activeAlertsListeners.forEach((listener) => listener(allActive));
  }
}

export const marketSignalAlertService = new MarketSignalAlertService();
