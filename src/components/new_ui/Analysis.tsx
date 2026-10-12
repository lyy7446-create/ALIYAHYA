import React from 'react';
import { MarketSymbol, Candle, SMCZone, TradingSignal } from '../../types';
import { AnalysisChartScreen } from '../AnalysisChartScreen';
import AnalysisPanel from '../AnalysisPanel';

interface AnalysisProps {
    market: MarketSymbol;
    currentPrice: number;
    candles: Candle[];
    zones: SMCZone[];
    activeSignal: TradingSignal | null;
    allSignals: TradingSignal[];
    selectedTimeframe: string;
    onSelectTimeframe: (tf: string) => void;
    onSelectMarket: (sym: MarketSymbol) => void;
    onReloadCandles: () => void;
    isConnected?: boolean;
}

export const Analysis: React.FC<AnalysisProps> = (props) => {
    const isConnected = props.isConnected !== false;
    return (
        <div className="w-full px-1 sm:px-2 pb-20 animate-in fade-in flex flex-col gap-3" dir="rtl">
            <AnalysisPanel 
              analysis={isConnected ? {
                supplyDemand: true,
                bos: Boolean(props.activeSignal),
                choch: Boolean(props.activeSignal?.qualityScore && props.activeSignal.qualityScore >= 75),
                orderBlocks: true,
                fvg: Boolean(props.activeSignal?.qualityScore && props.activeSignal.qualityScore >= 88),
                liquidity: true,
                mtf: Boolean(props.activeSignal?.qualityScore && props.activeSignal.qualityScore >= 85)
              } : undefined} 
              isConnected={isConnected} 
            />
            <div className="w-full institutional-card p-0.5 sm:p-1 rounded-2xl overflow-hidden">
              <AnalysisChartScreen {...props} isConnected={isConnected} />
            </div>
        </div>
    );
};
