import React, { useRef, useEffect, useState } from 'react';
import { MarketSymbol, Candle, SMCZone, TradingSignal } from '../types';
import { MARKET_BASES, formatTimeframeBadge, getMarketSpread } from '../utils/marketEngine';
import { TrendingUp, Flame, Radio, Award } from 'lucide-react';

interface InteractiveChartProps {
  candles: Candle[];
  market: MarketSymbol;
  zones: SMCZone[];
  activeSignal: TradingSignal | null;
  allSignals?: TradingSignal[];
  candleType: 'HEIKIN ASHI' | 'STANDARD';
  onChartClick?: (price: number) => void;
  showEMA50: boolean;
  showEMA200: boolean;
  showSuperTrend: boolean;
  showSMCZones: boolean;
  showBOS: boolean;
  showTP?: boolean;
  mtfScanner?: Record<string, string>;
  theme?: 'dark' | 'light';
  isConnected?: boolean;
}

export const getTargetCountByStrength = (sig: TradingSignal | null | undefined): number => {
  if (!sig) return 3;
  const score = sig.qualityScore ?? (sig.quality === 'A+' ? 95 : sig.quality === 'A' ? 80 : 65);
  const q = sig.quality || 'A';

  if (q === 'A+' || score >= 85) return 3; // Excellent strength -> 3 Targets (TP1, TP2, TP3)
  if (q === 'A' || q === 'B+' || score >= 70) return 2; // High strength -> 2 Targets (TP1, TP2)
  return 1; // Standard / Moderate strength -> 1 Target (TP1)
};

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  candles,
  market,
  zones,
  activeSignal,
  allSignals,
  candleType,
  onChartClick,
  showEMA50,
  showEMA200,
  showSuperTrend,
  showSMCZones,
  showBOS,
  showTP = true,
  mtfScanner,
  theme = 'dark',
  isConnected = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [hoveredX, setHoveredX] = useState<number | null>(null);

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const meta = MARKET_BASES[market];
  const digits = meta.digits;

  // TradingView Style panning, scrolling, zooming & drawing states
  const [zoomLevel, setZoomLevel] = useState(30); // default visible candles count (smaller count matches larger candle sizes)
  const [scrollOffset, setScrollOffset] = useState(0); // offset of candles shifted from the right end
  const [isAutoscale, setIsAutoscale] = useState(true);
  const [customMinPrice, setCustomMinPrice] = useState<number | null>(null);
  const [customMaxPrice, setCustomMaxPrice] = useState<number | null>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; scrollOffset: number; customMinPrice: number; customMaxPrice: number } | null>(null);

  // Price scale vertical drag-to-zoom state
  const [isAxisDragging, setIsAxisDragging] = useState(false);
  const [axisDragStart, setAxisDragStart] = useState<{ y: number; minPrice: number; maxPrice: number } | null>(null);

  // Persistent Touch gesture tracking for pinch-to-zoom & touch panning
  const touchStateRef = useRef<{
    lastDist: number | null;
    lastZoom: number;
    lastMidX: number;
    lastMidY: number;
    lastScrollOffset: number;
    lastMinPrice: number;
    lastMaxPrice: number;
    isMultiTouch: boolean;
  }>({
    lastDist: null,
    lastZoom: 35,
    lastMidX: 0,
    lastMidY: 0,
    lastScrollOffset: 0,
    lastMinPrice: 0,
    lastMaxPrice: 0,
    isMultiTouch: false,
  });

  // Drawing Tools
  const [drawingMode, setDrawingMode] = useState<'cursor' | 'trendline' | 'horizontal' | 'fib' | 'eraser'>('cursor');
  // Define Drawing structure based on global index + price values
  interface Drawing {
    id: string;
    type: 'trendline' | 'horizontal' | 'fib';
    points: { index: number; price: number }[];
  }
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [activeDrawingPoints, setActiveDrawingPoints] = useState<{ index: number; price: number }[]>([]);

  // Hovered candle for Top-Left OHLC details
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  // Live Smooth Candle Price Lerp & Pulse Animation
  const targetPriceRef = useRef<number | null>(null);
  const targetHighRef = useRef<number | null>(null);
  const targetLowRef = useRef<number | null>(null);
  const animPriceRef = useRef<number | null>(null);
  const animHighRef = useRef<number | null>(null);
  const animLowRef = useRef<number | null>(null);
  const lastMarketRef = useRef<MarketSymbol>(market);
  const lastCandleTimeRef = useRef<string | null>(null);

  const [animTick, setAnimTick] = useState(0);
  const animTickRef = useRef(0);

  const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;

  // Track target price changes for the latest candle
  useEffect(() => {
    if (!lastCandle) return;

    const isMarketChanged = lastMarketRef.current !== market;
    const isCandleTimeChanged = lastCandleTimeRef.current !== lastCandle.time;
    const maxStepGap = (meta.step || 1.0) * 15;
    const isLargePriceGap = animPriceRef.current !== null && Math.abs(animPriceRef.current - lastCandle.close) > maxStepGap;

    if (isMarketChanged || isCandleTimeChanged || isLargePriceGap || animPriceRef.current === null) {
      lastMarketRef.current = market;
      lastCandleTimeRef.current = lastCandle.time;
      targetPriceRef.current = lastCandle.close;
      targetHighRef.current = lastCandle.high;
      targetLowRef.current = lastCandle.low;
      animPriceRef.current = lastCandle.close;
      animHighRef.current = lastCandle.high;
      animLowRef.current = lastCandle.low;
    } else {
      targetPriceRef.current = lastCandle.close;
      targetHighRef.current = Math.max(targetHighRef.current ?? lastCandle.high, lastCandle.high);
      targetLowRef.current = Math.min(targetLowRef.current ?? lastCandle.low, lastCandle.low);
    }
  }, [lastCandle?.time, lastCandle?.close, lastCandle?.high, lastCandle?.low, market, meta.step]);

  // 60 FPS smooth animation lerp loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      animTickRef.current += 1;

      if (
        animPriceRef.current !== null &&
        targetPriceRef.current !== null &&
        targetHighRef.current !== null &&
        targetLowRef.current !== null
      ) {
        const diff = targetPriceRef.current - animPriceRef.current;
        if (Math.abs(diff) > 0.00001) {
          animPriceRef.current += diff * 0.22; // Smooth 22% lerp per frame
          animHighRef.current = Math.max(animHighRef.current ?? targetHighRef.current, animPriceRef.current, targetHighRef.current);
          animLowRef.current = Math.min(animLowRef.current ?? targetLowRef.current, animPriceRef.current, targetLowRef.current);
        } else {
          animPriceRef.current = targetPriceRef.current;
          animHighRef.current = targetHighRef.current;
          animLowRef.current = targetLowRef.current;
        }
      }

      setAnimTick((t) => (t + 1) % 100000);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Reset viewport state when market changes
  useEffect(() => {
    setScrollOffset(0);
    setIsAutoscale(true);
    setCustomMinPrice(null);
    setCustomMaxPrice(null);
    setActiveDrawingPoints([]);
  }, [market]);

  // Auto resize using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.max(width, 400),
        height: Math.max(height, 400),
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute subsegment range based on scroll and zoom multipliers
  const totalCandlesCount = candles.length;
  // clamp scrollOffset and zoom
  const visibleCount = Math.max(10, Math.min(zoomLevel, totalCandlesCount));
  const maxScrollOffset = Math.max(0, totalCandlesCount - visibleCount);
  const currentScrollOffset = Math.max(0, Math.min(scrollOffset, maxScrollOffset));

  const endIndex = totalCandlesCount - currentScrollOffset;
  const startIndex = Math.max(0, endIndex - visibleCount);

  // Portion of candles to render on physical panel
  const visibleCandles = candles.slice(startIndex, endIndex);

  // Compute scale boundaries dynamically
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  if (isAutoscale || customMinPrice === null || customMaxPrice === null) {
    visibleCandles.forEach((c) => {
      minPrice = Math.min(minPrice, c.low);
      maxPrice = Math.max(maxPrice, c.high);
      // Include EMA indicators
      if (showEMA50) {
        minPrice = Math.min(minPrice, c.ema50);
        maxPrice = Math.max(maxPrice, c.ema50);
      }
      if (showEMA200) {
        minPrice = Math.min(minPrice, c.ema200);
        maxPrice = Math.max(maxPrice, c.ema200);
      }
    });

    // Include dynamic animated live candle values if present
    if (animPriceRef.current !== null) {
      minPrice = Math.min(minPrice, animLowRef.current ?? animPriceRef.current, animPriceRef.current);
      maxPrice = Math.max(maxPrice, animHighRef.current ?? animPriceRef.current, animPriceRef.current);
    }
    if (activeSignal && activeSignal.market === market) {
      const targetCount = getTargetCountByStrength(activeSignal);
      const levels = [activeSignal.sl, activeSignal.entry];
      if (showTP) {
        if (targetCount >= 1 && activeSignal.tp1) levels.push(activeSignal.tp1);
        if (targetCount >= 2 && activeSignal.tp2) levels.push(activeSignal.tp2);
        if (targetCount >= 3 && activeSignal.tp3) levels.push(activeSignal.tp3);
      }
      minPrice = Math.min(minPrice, ...levels);
      maxPrice = Math.max(maxPrice, ...levels);
    }

    // Include active/pending order levels from allSignals list to prevent them from clipping on screen
    if (allSignals) {
      allSignals.forEach((sig) => {
        if (sig.market === market && (sig.status === 'Active' || sig.status === 'Pending')) {
          const targetCount = getTargetCountByStrength(sig);
          const levels = [sig.sl, sig.entry];
          if (showTP) {
            if (targetCount >= 1 && sig.tp1) levels.push(sig.tp1);
            if (targetCount >= 2 && sig.tp2) levels.push(sig.tp2);
            if (targetCount >= 3 && sig.tp3) levels.push(sig.tp3);
          }
          minPrice = Math.min(minPrice, ...levels);
          maxPrice = Math.max(maxPrice, ...levels);
        }
      });
    }

    // Fallback default
    if (minPrice === Infinity || maxPrice === -Infinity) {
      minPrice = meta.base - meta.step * 15;
      maxPrice = meta.base + meta.step * 15;
    }

    // Add 4% vertical padding so candles expand widely top to bottom
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.04 || meta.step * 3;
    minPrice = minPrice - padding;
    maxPrice = maxPrice + padding;
  } else {
    minPrice = customMinPrice;
    maxPrice = customMaxPrice;
  }

  const chartMinPrice = minPrice;
  const chartMaxPrice = maxPrice;

  // Coordinate helper functions (expanded in all directions to maximize chart viewport)
  const paddingRight = 60; // space for price scale
  const paddingBottom = 26; // space for time scale
  const paddingLeft = 4;
  const paddingTop = 8;

  const chartWidth = dimensions.width - paddingRight - paddingLeft;
  const chartHeight = dimensions.height - paddingBottom - paddingTop;

  const getX = (globalIndex: number) => {
    const localIndex = globalIndex - startIndex;
    const step = chartWidth / (visibleCount - 1 || 1);
    return paddingLeft + localIndex * step;
  };

  const getIndexFromX = (x: number) => {
    const relativeX = (x - paddingLeft) / chartWidth;
    const localIndex = relativeX * (visibleCount - 1);
    const globalIndex = Math.round(startIndex + localIndex);
    return Math.max(0, Math.min(globalIndex, totalCandlesCount - 1));
  };

  const getY = (price: number) => {
    const relative = (price - chartMinPrice) / (chartMaxPrice - chartMinPrice);
    return paddingTop + chartHeight * (1 - relative);
  };

  const getPriceFromY = (y: number) => {
    const relativeY = 1 - (y - paddingTop) / chartHeight;
    return chartMinPrice + relativeY * (chartMaxPrice - chartMinPrice);
  };

  // Zooming Handler (Scrolling the scroll wheel)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomIntensity = 0.08;
    const direction = e.deltaY > 0 ? 1 : -1;
    const change = Math.round(zoomLevel * zoomIntensity * direction);

    setZoomLevel((prev) => {
      const nextZoom = prev + change;
      return Math.max(12, Math.min(nextZoom, totalCandlesCount));
    });
  };

  // Click & Drag (Panning) / Drawing Tools start Handler
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked in price scale area (right side of chart)
    const inPriceScaleArea =
      clickX > paddingLeft + chartWidth &&
      clickX <= dimensions.width &&
      clickY >= paddingTop &&
      clickY <= paddingTop + chartHeight;

    if (inPriceScaleArea) {
      setIsAxisDragging(true);
      setAxisDragStart({
        y: clickY,
        minPrice: chartMinPrice,
        maxPrice: chartMaxPrice,
      });
      return;
    }

    // Is hover in active candle container boundaries?
    const inChartArea =
      clickX >= paddingLeft &&
      clickX <= paddingLeft + chartWidth &&
      clickY >= paddingTop &&
      clickY <= paddingTop + chartHeight;

    if (!inChartArea) return;

    const activePrice = getPriceFromY(clickY);
    const activeGlobalIdx = getIndexFromX(clickX);

    // Eraser mode removes shapes that are clicked nearby
    if (drawingMode === 'eraser') {
      const clickedGlobalIndex = activeGlobalIdx;
      const clickedPriceVal = activePrice;

      setDrawings((prev) =>
        prev.filter((drw) => {
          // If any point is within threshold, delete it!
          const matchThreshold = (chartMaxPrice - chartMinPrice) * 0.025;
          const indexThreshold = Math.max(1, Math.round(zoomLevel * 0.04));

          const matchesPoint = drw.points.some((p) => {
            const indexDiff = Math.abs(p.index - clickedGlobalIndex);
            const priceDiff = Math.abs(p.price - clickedPriceVal);
            return indexDiff <= indexThreshold && priceDiff <= matchThreshold;
          });
          return !matchesPoint;
        })
      );
      return;
    }

    // Active tool drawing state handlers
    if (drawingMode !== 'cursor') {
      const newPoint = { index: activeGlobalIdx, price: activePrice };

      if (drawingMode === 'horizontal') {
        const newDrawing: Drawing = {
          id: `horizontal-${Date.now()}`,
          type: 'horizontal',
          points: [newPoint],
        };
        setDrawings((prev) => [...prev, newDrawing]);
        setDrawingMode('cursor'); // reset to cursor
      } 
      
      else if (drawingMode === 'trendline' || drawingMode === 'fib') {
        const nextPoints = [...activeDrawingPoints, newPoint];
        if (nextPoints.length >= 2) {
          const newDrawing: Drawing = {
            id: `${drawingMode}-${Date.now()}`,
            type: drawingMode,
            points: nextPoints,
          };
          setDrawings((prev) => [...prev, newDrawing]);
          setActiveDrawingPoints([]);
          setDrawingMode('cursor'); // reset back to cursor
        } else {
          setActiveDrawingPoints(nextPoints);
        }
      }
      return;
    }

    // Panning & Hold and Drag functionality (Cursor mode)
    setIsDragging(true);
    setDragStart({
      x: clickX,
      y: clickY,
      scrollOffset: scrollOffset,
      customMinPrice: chartMinPrice,
      customMaxPrice: chartMaxPrice,
    });
  };

  // Mouse Movement tracker - handles drawing provisional drafts & panning viewport shift
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currX = e.clientX - rect.left;
    const currY = e.clientY - rect.top;

    // Handle vertical axis zoom dragging if active
    if (isAxisDragging && axisDragStart) {
      setIsAutoscale(false);
      const deltaY = currY - axisDragStart.y;
      
      // Calculate scale factor: dragging up (negative deltaY) should shrink price range (zoom in / stretch candles vertically)
      // dragging down (positive deltaY) should expand price range (zoom out / compress candles vertically)
      const factor = Math.exp(deltaY / 250);
      
      const midpoint = (axisDragStart.minPrice + axisDragStart.maxPrice) / 2;
      const halfRange = ((axisDragStart.maxPrice - axisDragStart.minPrice) / 2) * factor;
      
      // Prevent range from collapsing or exploding
      const minPossibleRange = meta.step * 1.5;
      const maxPossibleRange = meta.step * 2000;
      const clampedHalfRange = Math.max(minPossibleRange / 2, Math.min(halfRange, maxPossibleRange / 2));
      
      setCustomMinPrice(midpoint - clampedHalfRange);
      setCustomMaxPrice(midpoint + clampedHalfRange);
      return;
    }

    const inChartArea =
      currX >= paddingLeft &&
      currX <= paddingLeft + chartWidth &&
      currY >= paddingTop &&
      currY <= paddingTop + chartHeight;

    if (inChartArea) {
      const priceVal = getPriceFromY(currY);
      setHoveredPrice(priceVal);
      setHoveredX(currX);

      // Track hovered candle object for OHLC live stream overlays
      const gIndex = getIndexFromX(currX);
      if (candles[gIndex]) {
        setHoveredCandle(candles[gIndex]);
      } else {
        setHoveredCandle(null);
      }
    } else {
      setHoveredPrice(null);
      setHoveredX(null);
      setHoveredCandle(null);
    }

    // Panning calculation
    if (isDragging && dragStart && drawingMode === 'cursor') {
      setIsAutoscale(false);
      const deltaX = currX - dragStart.x;
      const deltaY = currY - dragStart.y;

      // X shift panning
      const step = chartWidth / visibleCount;
      const indexShift = Math.round(deltaX / step);
      setScrollOffset(Math.max(0, dragStart.scrollOffset + indexShift));

      // Y scale shifts (price)
      const pricePerPx = (dragStart.customMaxPrice - dragStart.customMinPrice) / chartHeight;
      const priceShift = deltaY * pricePerPx;
      setCustomMinPrice(dragStart.customMinPrice + priceShift);
      setCustomMaxPrice(dragStart.customMaxPrice + priceShift);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setIsAxisDragging(false);
    setAxisDragStart(null);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setDragStart(null);
    setIsAxisDragging(false);
    setAxisDragStart(null);
    setHoveredPrice(null);
    setHoveredX(null);
    setHoveredCandle(null);
  };

  // Full touchscreen support: Single-finger panning/interaction & Two-finger pinch-to-zoom and panning
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2) {
      // Two-finger pinch-to-zoom and pan
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

      touchStateRef.current = {
        lastDist: dist,
        lastZoom: zoomLevel,
        lastMidX: midX,
        lastMidY: midY,
        lastScrollOffset: scrollOffset,
        lastMinPrice: chartMinPrice,
        lastMaxPrice: chartMaxPrice,
        isMultiTouch: true,
      };

      setIsDragging(false); // disable single-finger drag starts
    } else if (e.touches.length === 1) {
      // Single-finger touch interaction
      const t = e.touches[0];
      const clickX = t.clientX - rect.left;
      const clickY = t.clientY - rect.top;

      // Check if touched in price scale area
      const inPriceScaleArea =
        clickX > paddingLeft + chartWidth &&
        clickX <= dimensions.width &&
        clickY >= paddingTop &&
        clickY <= paddingTop + chartHeight;

      if (inPriceScaleArea) {
        setIsAxisDragging(true);
        setAxisDragStart({
          y: clickY,
          minPrice: chartMinPrice,
          maxPrice: chartMaxPrice,
        });
        return;
      }

      const inChartArea =
        clickX >= paddingLeft &&
        clickX <= paddingLeft + chartWidth &&
        clickY >= paddingTop &&
        clickY <= paddingTop + chartHeight;

      if (!inChartArea) return;

      const activePrice = getPriceFromY(clickY);
      const activeGlobalIdx = getIndexFromX(clickX);

      // Handle Eraser / Drawing mode with single touch
      if (drawingMode !== 'cursor') {
        if (drawingMode === 'eraser') {
          const clickedGlobalIndex = activeGlobalIdx;
          const clickedPriceVal = activePrice;
          setDrawings((prev) =>
            prev.filter((drw) => {
              const matchThreshold = (chartMaxPrice - chartMinPrice) * 0.025;
              const indexThreshold = Math.max(1, Math.round(zoomLevel * 0.04));
              const matchesPoint = drw.points.some((p) => {
                const indexDiff = Math.abs(p.index - clickedGlobalIndex);
                const priceDiff = Math.abs(p.price - clickedPriceVal);
                return indexDiff <= indexThreshold && priceDiff <= matchThreshold;
              });
              return !matchesPoint;
            })
          );
        } else {
          const newPoint = { index: activeGlobalIdx, price: activePrice };
          if (drawingMode === 'horizontal') {
            const newDrawing: Drawing = {
              id: `horizontal-${Date.now()}`,
              type: 'horizontal',
              points: [newPoint],
            };
            setDrawings((prev) => [...prev, newDrawing]);
            setDrawingMode('cursor');
          } else if (drawingMode === 'trendline' || drawingMode === 'fib') {
            const nextPoints = [...activeDrawingPoints, newPoint];
            if (nextPoints.length >= 2) {
              const newDrawing: Drawing = {
                id: `${drawingMode}-${Date.now()}`,
                type: drawingMode,
                points: nextPoints,
              };
              setDrawings((prev) => [...prev, newDrawing]);
              setActiveDrawingPoints([]);
              setDrawingMode('cursor');
            } else {
              setActiveDrawingPoints(nextPoints);
            }
          }
        }
        return;
      }

      // Default single-finger panning start
      touchStateRef.current.isMultiTouch = false;
      setIsDragging(true);
      setDragStart({
        x: clickX,
        y: clickY,
        scrollOffset: scrollOffset,
        customMinPrice: chartMinPrice,
        customMaxPrice: chartMaxPrice,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2 && touchStateRef.current.isMultiTouch) {
      // Two-finger continuous pinch and/or pan
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
      const midY = (t1.clientY + t2.clientY) / 2 - rect.top;

      const ref = touchStateRef.current;

      // Zoom level based on continuous distance ratio
      if (ref.lastDist !== null && ref.lastDist > 0) {
        const zoomFactor = ref.lastDist / dist;
        const newZoom = Math.round(ref.lastZoom * zoomFactor);
        const clampedZoom = Math.max(12, Math.min(newZoom, totalCandlesCount));
        setZoomLevel(clampedZoom);
      }

      // Continuous midpoint panning (x & y shifting together)
      setIsAutoscale(false);
      const deltaX = midX - ref.lastMidX;
      const deltaY = midY - ref.lastMidY;

      // Horizontal scale
      const step = chartWidth / visibleCount;
      const indexShift = Math.round(deltaX / step);
      setScrollOffset(Math.max(0, ref.lastScrollOffset + indexShift));

      // Vertical price scale
      const pricePerPx = (ref.lastMaxPrice - ref.lastMinPrice) / chartHeight;
      const priceShift = deltaY * pricePerPx;
      setCustomMinPrice(ref.lastMinPrice + priceShift);
      setCustomMaxPrice(ref.lastMaxPrice + priceShift);

    } else if (e.touches.length === 1 && !touchStateRef.current.isMultiTouch) {
      // Single-finger touch move/hover update
      const t = e.touches[0];
      const currX = t.clientX - rect.left;
      const currY = t.clientY - rect.top;

      if (isAxisDragging && axisDragStart) {
        setIsAutoscale(false);
        const deltaY = currY - axisDragStart.y;
        
        // Calculate scale factor: dragging up (negative deltaY) should shrink price range (zoom in / stretch candles vertically)
        // dragging down (positive deltaY) should expand price range (zoom out / compress candles vertically)
        const factor = Math.exp(deltaY / 250);
        
        const midpoint = (axisDragStart.minPrice + axisDragStart.maxPrice) / 2;
        const halfRange = ((axisDragStart.maxPrice - axisDragStart.minPrice) / 2) * factor;
        
        // Prevent range from collapsing or exploding
        const minPossibleRange = meta.step * 1.5;
        const maxPossibleRange = meta.step * 2000;
        const clampedHalfRange = Math.max(minPossibleRange / 2, Math.min(halfRange, maxPossibleRange / 2));
        
        setCustomMinPrice(midpoint - clampedHalfRange);
        setCustomMaxPrice(midpoint + clampedHalfRange);
        return;
      }

      const inChartArea =
        currX >= paddingLeft &&
        currX <= paddingLeft + chartWidth &&
        currY >= paddingTop &&
        currY <= paddingTop + chartHeight;

      if (inChartArea) {
        const priceVal = getPriceFromY(currY);
        setHoveredPrice(priceVal);
        setHoveredX(currX);

        const gIndex = getIndexFromX(currX);
        if (candles[gIndex]) {
          setHoveredCandle(candles[gIndex]);
        } else {
          setHoveredCandle(null);
        }
      }

      // Single finger drag panning
      if (isDragging && dragStart && drawingMode === 'cursor') {
        setIsAutoscale(false);
        const deltaX = currX - dragStart.x;
        const deltaY = currY - dragStart.y;

        const step = chartWidth / visibleCount;
        const indexShift = Math.round(deltaX / step);
        setScrollOffset(Math.max(0, dragStart.scrollOffset + indexShift));

        const pricePerPx = (dragStart.customMaxPrice - dragStart.customMinPrice) / chartHeight;
        const priceShift = deltaY * pricePerPx;
        setCustomMinPrice(dragStart.customMinPrice + priceShift);
        setCustomMaxPrice(dragStart.customMaxPrice + priceShift);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setDragStart(null);
      setIsAxisDragging(false);
      setAxisDragStart(null);
      touchStateRef.current.isMultiTouch = false;
      touchStateRef.current.lastDist = null;
      setHoveredPrice(null);
      setHoveredX(null);
      setHoveredCandle(null);
    } else if (e.touches.length === 1) {
      // Fallback from 2 fingers to 1 finger - pivot dragging onto the remaining finger
      const t = e.touches[0];
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const clickX = t.clientX - rect.left;
        const clickY = t.clientY - rect.top;

        touchStateRef.current.isMultiTouch = false;
        setIsDragging(true);
        setDragStart({
          x: clickX,
          y: clickY,
          scrollOffset: scrollOffset,
          customMinPrice: chartMinPrice,
          customMaxPrice: chartMaxPrice,
        });
      }
    }
  };

  // Draw user custom TradingView-style shapes & drawings helper (reusable)
  const drawSingleDrawing = (ctx: CanvasRenderingContext2D, drw: Drawing | { type: string; points: { index: number; price: number }[] }) => {
    ctx.save();
    
    if (drw.type === 'horizontal') {
      const p = drw.points[0];
      if (p) {
        const y = getY(p.price);
        ctx.strokeStyle = '#38bdf8'; // light sky blue line
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(paddingLeft + chartWidth, y);
        ctx.stroke();

        // Label on scale (compact and shrunk)
        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 7px "JetBrains Mono", monospace';
        const drawTagWidth = 62;
        const drawTagHeight = 12;
        ctx.fillRect(paddingLeft + chartWidth + 2, y - drawTagHeight / 2, drawTagWidth, drawTagHeight);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`L: ${p.price.toFixed(digits)}`, paddingLeft + chartWidth + 2 + drawTagWidth / 2, y + 3);
      }
    } 
    
    else if (drw.type === 'trendline' && drw.points.length >= 2) {
      const p0 = drw.points[0];
      const p1 = drw.points[1];
      if (p0 && p1) {
        const x0 = getX(p0.index);
        const y0 = getY(p0.price);
        const x1 = getX(p1.index);
        const y1 = getY(p1.price);

        // draw beautiful trendline
        ctx.strokeStyle = '#22c55e'; // emerald green
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        // draw small anchors
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x0, y0, 3.5, 0, 2 * Math.PI);
        ctx.arc(x1, y1, 3.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    } 
    
    else if (drw.type === 'fib' && drw.points.length >= 2) {
      const p0 = drw.points[0];
      const p1 = drw.points[1];
      if (p0 && p1) {
        const x0 = getX(p0.index);
        const y0 = getY(p0.price);
        const x1 = getX(p1.index);
        const y1 = getY(p1.price);

        // Trend anchor line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.setLineDash([]);

        // Fib levels
        const startPrice = p0.price;
        const endPrice = p1.price;
        const range = endPrice - startPrice;

        const fibLevels = [
          { val: 0.0, label: '0.0 (100% - Start)', color: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' },
          { val: 0.236, label: '0.236 (23.6%)', color: 'rgba(249, 115, 22, 0.10)', text: '#f97316' },
          { val: 0.382, label: '0.382 (38.2%)', color: 'rgba(234, 179, 8, 0.10)', text: '#eab308' },
          { val: 0.5, label: '0.5 (50.0% Fib)', color: 'rgba(34, 197, 94, 0.12)', text: '#22c55e' },
          { val: 0.618, label: '0.618 (61.8% Golden)', color: 'rgba(34, 197, 94, 0.12)', text: '#22c55e' },
          { val: 0.786, label: '0.786 (78.6%)', color: 'rgba(168, 85, 247, 0.10)', text: '#a855f7' },
          { val: 1.0, label: '1.0 (0% - End)', color: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' }
        ];

        // Draw level paths and backgrounds
        fibLevels.forEach((lvl, i) => {
          const lPrice = startPrice + range * lvl.val;
          const yL = getY(lPrice);

          // Level lines
          ctx.strokeStyle = lvl.text;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(paddingLeft, yL);
          ctx.lineTo(paddingLeft + chartWidth, yL);
          ctx.stroke();

          // Background shading between levels
          if (i < fibLevels.length - 1) {
            const nextLPrice = startPrice + range * fibLevels[i + 1].val;
            const yNext = getY(nextLPrice);
            ctx.fillStyle = lvl.color;
            ctx.fillRect(paddingLeft, Math.min(yL, yNext), chartWidth, Math.abs(yNext - yL));
          }

          // Text labels next to levels
          ctx.fillStyle = lvl.text;
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.fillText(`${lvl.label} @ ${lPrice.toFixed(digits)}`, paddingLeft + 12, yL - 3);
        });
      }
    }

    ctx.restore();
  };

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentDpr = window.devicePixelRatio || 1;
    // Clear previous drawings on the physical canvas bounds
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(currentDpr, currentDpr);

    const isLight = theme === 'light';
    const bgFillColor = isLight ? '#f8fafc' : '#0a0a0c'; // slate-50 vs rich institutional black
    const gridColor = isLight ? '#e2e8f0' : '#18181c'; // slate-200 vs grid borders
    const textColor = isLight ? '#334155' : '#64748b'; // slate-700 vs slate grey text

    // Draw Background Grid
    ctx.fillStyle = bgFillColor;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    // Vertical time gridlines
    const gridCount = 8;
    for (let k = 0; k <= gridCount; k++) {
      if (visibleCandles.length < 2) break;
      const localIndex = Math.floor((visibleCandles.length - 1) * (k / gridCount));
      const globalIndex = startIndex + localIndex;
      const x = Math.round(getX(globalIndex)) + 0.5; // crisp 1px line
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + chartHeight);
      ctx.stroke();

      // Draw Time label below
      if (candles[globalIndex]) {
        ctx.fillStyle = textColor; // slate grey text
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(candles[globalIndex].time, x, paddingTop + chartHeight + 16);
      }
    }

    // Horizontal price gridlines
    const priceGridCount = 6;
    for (let j = 0; j <= priceGridCount; j++) {
      const pPrice = chartMinPrice + (chartMaxPrice - chartMinPrice) * (j / priceGridCount);
      const y = Math.round(getY(pPrice)) + 0.5; // crisp 1px line
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartWidth, y);
      ctx.stroke();

      // Draw Price label right
      ctx.fillStyle = textColor;
      ctx.font = '8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(pPrice.toFixed(digits), paddingLeft + chartWidth + 6, y + 3);
    }

    // 2. Draw Smart Money Zones with Clean Minimalist Outline Lines (No Background Block Fill)
    if (showSMCZones) {
      zones.forEach((zone) => {
        const yTop = getY(Math.max(zone.priceMin, zone.priceMax));
        const yBot = getY(Math.min(zone.priceMin, zone.priceMax));

        let labelColor = isLight ? '#dc2626' : '#ff3b60';
        let label = 'SUPPLY';

        if (zone.type === 'Demand Zone') {
          labelColor = isLight ? '#059669' : '#00e693';
          label = 'DEMAND';
        } else if (zone.type === 'Order Block') {
          labelColor = isLight ? '#2563eb' : '#38bdf8';
          label = 'ORDER';
        } else if (zone.type === 'Fair Value Gap') {
          labelColor = isLight ? '#9333ea' : '#c084fc';
          label = 'FVG';
        } else if (zone.type === 'Breaker Block') {
          labelColor = isLight ? '#ca8a04' : '#facc15';
          label = 'BRK';
        } else if (zone.type === 'Liquidity Pool') {
          labelColor = isLight ? '#e11d48' : '#fb7185';
          label = 'LIQ';
        }

        ctx.save();

        // Draw clean thin boundary lines at top and bottom of zone band without filled background blocks
        ctx.strokeStyle = labelColor;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, yTop);
        ctx.lineTo(paddingLeft + chartWidth, yTop);
        ctx.moveTo(paddingLeft, yBot);
        ctx.lineTo(paddingLeft + chartWidth, yBot);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        ctx.restore();

        // Draw horizontal dashed lines for boundaries & right axis tags
        const pricesToDraw = [zone.priceMin, zone.priceMax];
        pricesToDraw.forEach((price) => {
          const rawY = getY(price);
          const y = Math.round(rawY) + 0.5;

          if (rawY >= paddingTop && rawY <= paddingTop + chartHeight) {
            ctx.save();
            ctx.strokeStyle = labelColor;
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 0.9;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(paddingLeft, y);
            ctx.lineTo(paddingLeft + chartWidth, y);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;

            // Draw right axis label tag
            const tagX = paddingLeft + chartWidth + 2;
            const tagWidth = 64;
            const tagHeight = 14;
            const abbrWidth = 20;

            // Draw badge background
            ctx.fillStyle = labelColor;
            ctx.fillRect(tagX, y - tagHeight / 2, abbrWidth, tagHeight);

            // Draw right segment price container
            ctx.fillStyle = !isLight ? '#0f0f17' : '#ffffff';
            ctx.fillRect(tagX + abbrWidth, y - tagHeight / 2, tagWidth - abbrWidth, tagHeight);

            ctx.strokeStyle = labelColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(tagX + abbrWidth, y - tagHeight / 2, tagWidth - abbrWidth, tagHeight);

            // Draw Abbr Text
            ctx.fillStyle = !isLight && (labelColor === '#00e693' || labelColor === '#facc15') ? '#022c1e' : '#ffffff';
            ctx.font = 'bold 7.5px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, tagX + abbrWidth / 2, y);

            // Draw Price Text
            ctx.fillStyle = !isLight ? '#f1f5f9' : '#0f172a';
            ctx.font = 'bold 8px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(price.toFixed(digits), tagX + abbrWidth + (tagWidth - abbrWidth) / 2, y);

            ctx.restore();
          }
        });

        // Draw small name tag inside the zone band with clean translucent pill
        ctx.save();
        const scoreVal = zone.score || zone.strength || 80;
        const freshTag = !zone.isMitigated ? '💎 عذراء غير ملموسة' : '⚠️ مختبرة';
        const zoneTitleText = `${zone.type.toUpperCase()} (${zone.timeframe}) • ${freshTag} • ${scoreVal}%`;
        ctx.font = 'bold 8.5px "Inter", sans-serif';
        const textMetrics = ctx.measureText(zoneTitleText);
        const pillWidth = textMetrics.width + 12;
        const pillHeight = 14;

        ctx.fillStyle = !isLight ? 'rgba(7, 7, 12, 0.65)' : 'rgba(255, 255, 255, 0.75)';
        ctx.fillRect(paddingLeft + 8, yTop + 3, pillWidth, pillHeight);
        
        ctx.strokeStyle = labelColor;
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(paddingLeft + 8, yTop + 3, pillWidth, pillHeight);

        ctx.fillStyle = labelColor;
        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(zoneTitleText, paddingLeft + 14, yTop + 3 + pillHeight / 2);
        ctx.restore();
      });
    }

    // 2.5 Draw Current Price (Bid & Ask Lines), Animated Ripple Pulse, and MT5 Right Axis Tags
    if (lastCandle) {
      const currentPrice = animPriceRef.current !== null ? animPriceRef.current : lastCandle.close;
      const spreadInfo = getMarketSpread(market);
      const bidPrice = currentPrice;
      const askPrice = currentPrice + spreadInfo.spreadValue;

      const yBid = getY(bidPrice);
      const yAsk = getY(askPrice);

      const isBullishTick = currentPrice >= lastCandle.open;
      const bidColor = isBullishTick ? '#00E676' : '#38bdf8';
      const askColor = '#ef4444';

      // 1. Draw MT5 Ask Line (Red dashed line)
      if (yAsk >= paddingTop && yAsk <= paddingTop + chartHeight) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, yAsk);
        ctx.lineTo(paddingLeft + chartWidth, yAsk);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ask tag on Y axis
        const tagX = paddingLeft + chartWidth + 2;
        const tagWidth = 64;
        const tagHeight = 13;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.fillRect(tagX, yAsk - tagHeight / 2, tagWidth, tagHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Ask ${askPrice.toFixed(digits)}`, tagX + tagWidth / 2, yAsk);
      }

      // 2. Draw MT5 Bid / Current Price Line
      if (yBid >= paddingTop && yBid <= paddingTop + chartHeight) {
        // Draw horizontal current price line with live color
        ctx.strokeStyle = isBullishTick ? 'rgba(0, 230, 118, 0.85)' : 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(paddingLeft, yBid);
        ctx.lineTo(paddingLeft + chartWidth, yBid);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated live ripple dot on tip of last candle
        const lastCandleX = getX(totalCandlesCount - 1);
        const pulsePhase = (animTickRef.current * 0.12) % (Math.PI * 2);
        const ringRadius = 3.5 + Math.sin(pulsePhase) * 3;
        const ringOpacity = 0.85 - Math.sin(pulsePhase) * 0.35;

        ctx.strokeStyle = (isBullishTick ? 'rgba(0, 230, 118, ' : 'rgba(56, 189, 248, ') + ringOpacity + ')';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(lastCandleX, yBid, ringRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = isBullishTick ? '#00E676' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(lastCandleX, yBid, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw price tag on Y axis with live glowing shadow
        const tagX = paddingLeft + chartWidth + 2;
        const tagWidth = 64;
        const tagHeight = 15;

        ctx.save();
        ctx.shadowColor = bidColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = bidColor;
        ctx.fillRect(tagX, yBid - tagHeight / 2, tagWidth, tagHeight);
        ctx.restore();

        // Price text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bidPrice.toFixed(digits), tagX + tagWidth / 2, yBid + 0.5);
      }
    }

    // 2.6 Draw 'Liquidity Sweep' & 'High Liquidity' levels next to the price bar (SMC Liquidity Sweeps)
    if (showBOS) {
      const sweeps: { price: number; type: 'buy' | 'sell'; age: number }[] = [];
      visibleCandles.forEach((c, idx) => {
        if (c.liquiditySweep) {
          sweeps.push({
            price: c.liquiditySweep.price,
            type: c.liquiditySweep.type,
            age: visibleCandles.length - idx
          });
        }
      });

      // Keep unique sweeps within a reasonable step tolerance to prevent clutter on the price bar
      const uniqueSweeps: typeof sweeps[] = [];
      const tolerance = meta.step * 1.5;
      
      const filteredSweeps: typeof sweeps = [];
      sweeps.forEach((sw) => {
        const exists = filteredSweeps.some(u => Math.abs(u.price - sw.price) < tolerance);
        if (!exists) {
          filteredSweeps.push(sw);
        }
      });

      // Show up to the 3 most recent sweeps
      const displayedSweeps = filteredSweeps.slice(0, 3);

      displayedSweeps.forEach((sw) => {
        const rawY = getY(sw.price);
        const y = Math.round(rawY) + 0.5;

        if (rawY >= paddingTop && rawY <= paddingTop + chartHeight) {
          // 1. Draw glowing horizontal line across the chart
          ctx.save();
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)'; // Glowing rose pink
          ctx.lineWidth = 1.0;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(paddingLeft, y);
          ctx.lineTo(paddingLeft + chartWidth, y);
          ctx.stroke();
          ctx.restore();

          // 2. Draw a gorgeous badge inside the right edge of the chart grid (next to the price bar)
          ctx.save();
          const badgeW = 75;
          const badgeH = 14;
          const badgeX = paddingLeft + chartWidth - badgeW - 4;
          const badgeY = y - badgeH / 2;

          // Draw rounded rectangle background with dark glassmorphic styling
          ctx.fillStyle = 'rgba(15, 10, 15, 0.9)';
          ctx.strokeStyle = '#f43f5e'; // solid rose pink border
          ctx.lineWidth = 1.0;
          
          ctx.beginPath();
          if ((ctx as any).roundRect) {
            (ctx as any).roundRect(badgeX, badgeY, badgeW, badgeH, 4);
          } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH);
          }
          ctx.fill();
          ctx.stroke();

          // Draw small pulsing glowing neon circle inside the badge
          ctx.fillStyle = '#f43f5e';
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.arc(badgeX + 8, y, 2.5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.shadowBlur = 0; // reset shadow

          // Draw Badge text ("⚡ SWEEP")
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 7px "Inter", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡ SWEEP', badgeX + 15, y);

          // Draw Price portion inside the badge in a soft rose color
          ctx.fillStyle = '#fda4af';
          ctx.font = 'bold 7px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(sw.price.toFixed(digits), badgeX + badgeW - 6, y);

          ctx.restore();

          // 3. Draw a premium indicator badge directly on the price bar itself (right scale axis)
          ctx.save();
          const tagX = paddingLeft + chartWidth + 2;
          const tagWidth = 62;
          const tagHeight = 13;

          // Draw badge background with a solid glowing rose color
          ctx.fillStyle = '#f43f5e'; 
          ctx.fillRect(tagX, y - tagHeight / 2, tagWidth, tagHeight);

          // Draw white text indicating sweep next to the price
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`💧 ${sw.price.toFixed(digits)}`, tagX + tagWidth / 2, y);

          ctx.restore();
        }
      });
    }

    // 3. Draw Indicators Lines (EMA 50 / EMA 200) within visible segment bounds
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (showEMA50 && visibleCandles.length > 1) {
      ctx.strokeStyle = '#3b82f6'; // Bright blue
      ctx.lineWidth = 2.0; // Slightly thicker for smooth high-res rendering
      ctx.beginPath();
      ctx.moveTo(getX(startIndex), getY(candles[startIndex].ema50));
      for (let i = startIndex + 1; i < endIndex; i++) {
        if (!candles[i]) continue;
        ctx.lineTo(getX(i), getY(candles[i].ema50));
      }
      ctx.stroke();
    }

    if (showEMA200 && visibleCandles.length > 1) {
      ctx.strokeStyle = '#f59e0b'; // Gold / Orange
      ctx.lineWidth = 2.0; // Slightly thicker for smooth high-res rendering
      ctx.beginPath();
      ctx.moveTo(getX(startIndex), getY(candles[startIndex].ema200));
      for (let i = startIndex + 1; i < endIndex; i++) {
        if (!candles[i]) continue;
        ctx.lineTo(getX(i), getY(candles[i].ema200));
      }
      ctx.stroke();
    }

    // SuperTrend Indicator shading & Line within visible bounds
    if (showSuperTrend && visibleCandles.length > 1) {
      ctx.lineWidth = 2.0;
      for (let i = startIndex + 1; i < endIndex; i++) {
        const prev = candles[i - 1];
        const curr = candles[i];
        if (!prev || !curr) continue;
        
        ctx.strokeStyle = curr.superTrendTrend === 'bull' ? 'rgba(34, 197, 94, 0.85)' : 'rgba(239, 68, 68, 0.85)';
        const currVal = curr.superTrendTrend === 'bull' ? curr.superTrendLower : curr.superTrendUpper;
        const prevVal = prev.superTrendTrend === 'bull' ? prev.superTrendLower : prev.superTrendUpper;

        if (currVal && prevVal && curr.superTrendTrend === prev.superTrendTrend) {
          ctx.beginPath();
          ctx.moveTo(getX(i - 1), getY(prevVal));
          ctx.lineTo(getX(i), getY(currVal));
          ctx.stroke();
        }
      }
    }

    // 4. Draw Candlesticks in visible subsegment - Ultra High Vividness & Live Animated Movement
    visibleCandles.forEach((c, idx) => {
      const globalIdx = startIndex + idx;
      const isLastGlobalCandle = globalIdx === totalCandlesCount - 1;
      const x = getX(globalIdx);
      const wickX = Math.round(x) + 0.5; // Perfectly sharp 1px wick alignment

      // Interpolated values for latest candle to move smoothly with live price ticks
      const liveClose = isLastGlobalCandle && animPriceRef.current !== null ? animPriceRef.current : c.close;
      const liveHigh = isLastGlobalCandle && animHighRef.current !== null ? Math.max(c.high, animHighRef.current, liveClose) : c.high;
      const liveLow = isLastGlobalCandle && animLowRef.current !== null ? Math.min(c.low, animLowRef.current, liveClose) : c.low;
      
      // Use chosen Candle mode values
      const open = candleType === 'HEIKIN ASHI' ? c.haOpen : c.open;
      const close = candleType === 'HEIKIN ASHI' ? c.haClose : liveClose;
      const high = candleType === 'HEIKIN ASHI' ? c.haHigh : liveHigh;
      const low = candleType === 'HEIKIN ASHI' ? c.haLow : liveLow;

      const isBullish = close >= open;

      // Candle body dimensions - Larger, bolder candles (0.83 slot coverage)
      const yOpen = getY(open);
      const yClose = getY(close);
      const yTop = Math.min(yOpen, yClose);
      const yBot = Math.max(yOpen, yClose);
      const bodyWidth = Math.max(5.0, (chartWidth / visibleCount) * 0.83);

      const bodyLeft = Math.round(x - bodyWidth / 2);
      const bodyRight = Math.round(x + bodyWidth / 2);
      const bodyPixelWidth = Math.max(2, bodyRight - bodyLeft);
      const roundedYTop = Math.round(yTop);
      const roundedYBot = Math.round(yBot);
      const bodyPixelHeight = Math.max(1, roundedYBot - roundedYTop);

      // Ultra Vivid Neon Color Palette
      const bullColor = '#00E676';  // Vivid Electric Green
      const bullBorder = '#00FF88'; // Sharp Vibrant Green Outline
      const bearColor = '#FF1744';  // Vivid Neon Crimson
      const bearBorder = '#FF5252'; // Sharp Vibrant Red Outline

      // Wick (high-low line) - Bold, sharp, high contrast
      ctx.strokeStyle = isBullish ? bullColor : bearColor;
      ctx.lineWidth = bodyPixelWidth >= 6 ? 1.5 : 1.2;
      ctx.beginPath();
      ctx.moveTo(wickX, Math.round(getY(high)));
      ctx.lineTo(wickX, Math.round(getY(low)));
      ctx.stroke();

      // Body fill - Solid Vibrant Fill with live aura shadow for last active candle
      if (isLastGlobalCandle) {
        ctx.save();
        ctx.shadowColor = isBullish ? bullColor : bearColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = isBullish ? bullColor : bearColor;
        ctx.fillRect(bodyLeft, roundedYTop, bodyPixelWidth, bodyPixelHeight);
        ctx.restore();
      } else {
        ctx.fillStyle = isBullish ? bullColor : bearColor;
        ctx.fillRect(bodyLeft, roundedYTop, bodyPixelWidth, bodyPixelHeight);
      }

      // Outer sharp border for maximum clarity and definition
      ctx.strokeStyle = isBullish ? bullBorder : bearBorder;
      ctx.lineWidth = 1.0;
      ctx.strokeRect(bodyLeft + 0.5, roundedYTop + 0.5, bodyPixelWidth - 1, bodyPixelHeight - 1);

      // 5. Draw BOS / CHOCH text annotations if enabled
      if (showBOS) {
        if (c.bos) {
          const b = c.bos;
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(getX(b.index), getY(b.price));
          ctx.lineTo(x, getY(b.price));
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`BOS (${b.type === 'bullish' ? '▲' : '▼'})`, x - 2, getY(b.price) - 4);
        }

        if (c.choch) {
          const ch = c.choch;
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
          ctx.setLineDash([2, 5]);
          ctx.beginPath();
          ctx.moveTo(getX(ch.index), getY(ch.price));
          ctx.lineTo(x, getY(ch.price));
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#f43f5e';
          ctx.font = 'bold 8px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`CHoCH (${ch.type === 'bullish' ? '▲' : '▼'})`, x - 2, getY(ch.price) - 4);
        }

        if (c.liquiditySweep) {
          const sweep = c.liquiditySweep;
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(x, getY(sweep.price), 3, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#f59e0b';
          ctx.font = '9px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ SWEEP', x, getY(sweep.price) + (sweep.type === 'buy' ? -10 : 12));
        }
      }
    });

    // 6. DRAW THE ACTIVE / PLACED SIGNAL levels & lines (Institutional Signal overlays)
    if (activeSignal && activeSignal.market === market) {
      const sig = activeSignal;
      const isShort = sig.type === 'SELL LIMIT' || sig.type === 'SELL STOP';
      const targetCount = getTargetCountByStrength(sig);

      // Level coordinates
      const yEntry = getY(sig.entry);
      const ySL = getY(sig.sl);
      const yTP1 = getY(sig.tp1);
      const yTP2 = getY(sig.tp2);
      const yTP3 = getY(sig.tp3);

      // Dash arrays for level roles
      const drawSignalLevel = (y: number, label: string, color: string, styleDash: number[] = []) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        if (styleDash.length) ctx.setLineDash(styleDash);
        
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(paddingLeft + chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label flag background
        ctx.fillStyle = color;
        const rectWidth = 110;
        const rectHeight = 18;
        ctx.fillRect(paddingLeft + chartWidth - rectWidth, y - rectHeight / 2, rectWidth, rectHeight);

        // Text inside label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, paddingLeft + chartWidth - rectWidth / 2, y + 3);
      };

      // Draw horizontal target lines based on recommendation strength
      drawSignalLevel(ySL, `SL: ${sig.sl.toFixed(digits)}`, '#dc2626', [3, 2]); // red sl
      drawSignalLevel(yEntry, `${sig.type}: ${sig.entry.toFixed(digits)}`, '#3b82f6'); // blue limit entry
      if (showTP) {
        if (targetCount >= 1 && sig.tp1) {
          drawSignalLevel(yTP1, `🎯 الهدف 1: ${sig.tp1.toFixed(digits)}`, '#10b981', [4, 4]); // green target 1
        }
        if (targetCount >= 2 && sig.tp2) {
          drawSignalLevel(yTP2, `🎯 الهدف 2: ${sig.tp2.toFixed(digits)}`, '#10b981', [4, 4]); // green target 2
        }
        if (targetCount >= 3 && sig.tp3) {
          drawSignalLevel(yTP3, `🎯 الهدف 3: ${sig.tp3.toFixed(digits)}`, '#10b981', [4, 4]); // green target 3
        }
      }

      // Draw the exact premium TradingView "Signal Box Overlay" as shown in user request
      const boxX = paddingLeft + 15;
      const visibleTpRows = !showTP ? 0 : targetCount;
      const boxHeight = visibleTpRows === 0 ? 82 : visibleTpRows === 1 ? 96 : visibleTpRows === 2 ? 110 : 124;
      const boxY = yEntry - (isShort ? (boxHeight + 20) : -10); // place box above or below depending on target direction
      const boxWidth = 175;

      // Border and shadow
      ctx.fillStyle = 'rgba(15, 15, 20, 0.95)';
      ctx.strokeStyle = isShort ? 'rgba(239, 68, 68, 0.85)' : 'rgba(34, 197, 94, 0.85)';
      ctx.lineWidth = 2;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      // Entry title
      ctx.fillStyle = isShort ? '#ef4444' : '#22c55e';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${sig.type} • [${formatTimeframeBadge(sig.timeframe)}]`, boxX + 10, boxY + 16);

      // Quality rating & strength indicator
      ctx.fillStyle = '#f59e0b';
      ctx.font = '9px "Inter", sans-serif';
      const strengthBadge = targetCount === 3 ? 'فائقة (3 أهداف)' : targetCount === 2 ? 'قوية (هدفين)' : 'عادية (هدف 1)';
      ctx.fillText(`QUALITY: ${sig.quality || 'A'} ⭐ | ${strengthBadge}`, boxX + 10, boxY + 30);

      // Inside rows
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`ENTRY: ${sig.entry.toFixed(digits)}`, boxX + 10, boxY + 46);
      ctx.fillText(`ZONE : ${sig.zoneMin.toFixed(digits)} - ${sig.zoneMax.toFixed(digits)}`, boxX + 10, boxY + 60);

      ctx.fillStyle = '#fca5a5';
      ctx.fillText(`SL   : ${sig.sl.toFixed(digits)}`, boxX + 10, boxY + 74);

      if (showTP) {
        ctx.fillStyle = '#86efac';
        if (targetCount >= 1 && sig.tp1) {
          ctx.fillText(`الهدف 1: ${sig.tp1.toFixed(digits)}`, boxX + 10, boxY + 88);
        }
        if (targetCount >= 2 && sig.tp2) {
          ctx.fillText(`الهدف 2: ${sig.tp2.toFixed(digits)}`, boxX + 10, boxY + 100);
        }
        if (targetCount >= 3 && sig.tp3) {
          ctx.fillText(`الهدف 3: ${sig.tp3.toFixed(digits)}`, boxX + 10, boxY + 112);
        }
      }
    }

    // 6.5 DRAW PLACED PENDING / ACTIVE SIGNALS (Levels & lines from allSignals list)
    if (allSignals) {
      allSignals.forEach((sig) => {
        if (sig.market === market && (sig.status === 'Pending' || sig.status === 'Active')) {
          const isPending = sig.status === 'Pending';
          const targetCount = getTargetCountByStrength(sig);
          
          // Coordinate calculations
          const yEntry = getY(sig.entry);
          const ySL = getY(sig.sl);
          const yTP1 = getY(sig.tp1);
          const yTP2 = getY(sig.tp2);
          const yTP3 = getY(sig.tp3);

          const signalLabelColor = isPending ? '#f59e0b' : '#3b82f6'; // Yellow (Pending) vs Royal Blue (Active)
          const orderTypeLabel = `${isPending ? '⏳ أمر معلق' : '🔵 صفقة مفعّلة ونشطة'} [${sig.type}] (${formatTimeframeBadge(sig.timeframe)})`;

          // Draw level line helper
          const drawOrderLevel = (y: number, label: string, color: string, styleDash: number[] = [4, 4], isEntryLine = false) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = isEntryLine ? 1.5 : 1.0;
            ctx.setLineDash(styleDash);
            
            ctx.beginPath();
            ctx.moveTo(paddingLeft, y);
            ctx.lineTo(paddingLeft + chartWidth, y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Tiny flag background
            ctx.fillStyle = color;
            ctx.font = 'bold 8px "Inter", sans-serif';
            const textWidth = ctx.measureText(label).width + 12;
            const rectWidth = Math.max(70, textWidth);
            const rectHeight = 14;
            ctx.fillRect(paddingLeft + 10, y - rectHeight / 2, rectWidth, rectHeight);

            // Text
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(label, paddingLeft + 16, y + 3);
          };

          // Draw lines
          drawOrderLevel(yEntry, `${orderTypeLabel} @ ${sig.entry.toFixed(digits)}`, signalLabelColor, [5, 2], true);
          drawOrderLevel(ySL, `🛑 و.خ: ${sig.sl.toFixed(digits)}`, 'rgba(239, 68, 68, 0.75)', [2, 2]);
          if (showTP) {
            if (targetCount >= 1 && sig.tp1) {
              drawOrderLevel(yTP1, `🎯 الهدف 1: ${sig.tp1.toFixed(digits)}`, 'rgba(34, 197, 94, 0.85)', [3, 2]);
            }
            if (targetCount >= 2 && sig.tp2) {
              drawOrderLevel(yTP2, `🎯 الهدف 2: ${sig.tp2.toFixed(digits)}`, 'rgba(34, 197, 94, 0.85)', [3, 2]);
            }
            if (targetCount >= 3 && sig.tp3) {
              drawOrderLevel(yTP3, `🎯 الهدف 3: ${sig.tp3.toFixed(digits)}`, 'rgba(34, 197, 94, 0.85)', [3, 2]);
            }
          }
        }
      });
    }

    // Draw completed drawings
    drawings.forEach((drw) => drawSingleDrawing(ctx, drw));

    ctx.restore();
  }, [
    dimensions,
    candles,
    market,
    zones,
    activeSignal,
    allSignals,
    candleType,
    showEMA50,
    showEMA200,
    showSuperTrend,
    showSMCZones,
    showBOS,
    showTP,
    theme,
    drawings,
    zoomLevel,
    scrollOffset,
    isAutoscale,
    customMinPrice,
    customMaxPrice,
    animTick,
  ]);

  // Render dynamic overlay canvas (crosshairs & draft drawings) at 60fps on separate layer
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear previous dynamic drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentDpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(currentDpr, currentDpr);

    // Draw provisional drawing (draft in-progress)
    if (activeDrawingPoints.length > 0 && hoveredPrice !== null && hoveredX !== null) {
      const draftDrawing = {
        type: drawingMode,
        points: [...activeDrawingPoints, { index: getIndexFromX(hoveredX), price: hoveredPrice }]
      };
      drawSingleDrawing(ctx, draftDrawing);
    }

    // Render dynamic price-hover hairline crosshair
    if (hoveredPrice !== null && hoveredX !== null) {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.15)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 0.8;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hoveredX, paddingTop);
      ctx.lineTo(hoveredX, paddingTop + chartHeight);
      ctx.stroke();

      // Horizontal line
      const hoverY = getY(hoveredPrice);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, hoverY);
      ctx.lineTo(paddingLeft + chartWidth, hoverY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Draw floating coordinates flag on scales (compact and shrunk)
      ctx.fillStyle = isLight ? '#ffffff' : '#0f172a';
      ctx.strokeStyle = isLight ? '#94a3b8' : '#64748b';
      ctx.lineWidth = 1;
      
      const priceTagHeight = 13;
      const priceTagWidth = 62;
      const priceTagY = hoverY - priceTagHeight / 2;
      ctx.fillRect(paddingLeft + chartWidth + 2, priceTagY, priceTagWidth, priceTagHeight);
      ctx.strokeRect(paddingLeft + chartWidth + 2, priceTagY, priceTagWidth, priceTagHeight);

      ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hoveredPrice.toFixed(digits), paddingLeft + chartWidth + 2 + priceTagWidth / 2, hoverY + 3);
    }

    ctx.restore();
  }, [
    dimensions,
    hoveredPrice,
    hoveredX,
    activeDrawingPoints,
    drawingMode,
    digits,
    theme,
  ]);

  // Navigation and Drawing listeners are bound directly in component scope above.

  // Institutional Levels details shown under the chart as in user's request
  const h1ResZone = zones.find(z => z.type === 'Supply Zone' && z.timeframe === '1H');
  const h8SupZone = zones.find(z => z.type === 'Demand Zone' && z.timeframe === '8H');

  const isLight = theme === 'light';

  return (
    <div className={`flex flex-col w-full h-full overflow-hidden transition-all duration-200 ${
      isLight 
        ? 'bg-white text-slate-800' 
        : 'bg-[#0a0a0c] text-white'
    }`}>
      {/* Main interactive stage */}
      <div id="chart-viewport" ref={containerRef} className={`relative flex-1 w-full overflow-hidden select-none transition-all duration-200 ${
        isLight ? 'bg-[#f8fafc]' : 'bg-[#0a0a0c]'
      }`}>
        
        {/* Toolbar has been removed as requested */}
 
         <canvas
           id="candle-canvas"
           ref={canvasRef}
           width={dimensions.width * dpr}
           height={dimensions.height * dpr}
           style={{ width: dimensions.width, height: dimensions.height }}
           onWheel={handleWheel}
           onMouseDown={handleMouseDown}
           onMouseMove={handleMouseMove}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseLeave}
           onTouchStart={handleTouchStart}
           onTouchMove={handleTouchMove}
           onTouchEnd={handleTouchEnd}
           onTouchCancel={handleTouchEnd}
           className="absolute inset-0 block cursor-crosshair touch-none"
         />
         <canvas
           id="overlay-canvas"
           ref={overlayCanvasRef}
           width={dimensions.width * dpr}
           height={dimensions.height * dpr}
           style={{ width: dimensions.width, height: dimensions.height }}
           className="absolute inset-0 block pointer-events-none z-10"
         />

         {/* Disconnection Overlay: Halts chart updates and displays waiting status */}
         {!isConnected && (
           <div className="absolute inset-0 z-30 bg-black/65 backdrop-blur-[3px] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in">
             <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-2xl flex flex-col items-center gap-3 max-w-sm">
               <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                 <Radio className="w-6 h-6 animate-pulse" />
               </div>
               <div className="space-y-1">
                 <h3 className="text-base font-extrabold text-white">بانتظار الاتصال بالخادم</h3>
                 <p className="text-xs text-slate-300 leading-relaxed">
                   انقطع الاتصال بالبث المباشر. تم تجميد حركة الشارت والأسعار والتحليل تلقائياً لحين عودة الاتصال.
                 </p>
               </div>
               <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-300">
                 <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                 <span>جاري محاولة الاتصال التلقائي...</span>
               </div>
             </div>
           </div>
         )}
 
         {/* MT5 Terminal Live Telemetry HUD hidden per user request */}
        {/* Floating Manual Overlay guide for quick price pickup when onChartClick triggers */}
       </div>
    </div>
  );
};
