import { TradingSignal, MarketSymbol } from '../types';
import { MARKET_BASES } from './marketEngine';

export interface TelegramFormattedCard {
  plainText: string;
  htmlText: string;
}

function getMarketPairSymbol(market: MarketSymbol): string {
  if (market === 'XAUUSD') return 'XAU/USD';
  if (market === 'EURUSD') return 'EUR/USD';
  if (market === 'GBPUSD') return 'GBP/USD';
  if (market === 'BTCUSD') return 'BTC/USD';
  return market;
}

function getQualityStars(quality: string): string {
  if (quality === 'A+' || quality === 'A') return '★★★★★';
  if (quality === 'B+') return '★★★★☆';
  if (quality === 'B') return '★★★☆☆';
  return '★★☆☆☆';
}

/**
 * دالة لتحديد أهداف الصفقة بناءً على جودة التوصية (Quality) ونوع الإشارة:
 * - توصيات A+ فائقة الجودة: 3 إلى 4 أهداف
 * - توصيات A القوية: 3 أهداف
 * - توصيات B+ و B العادية/السريعة: هدفين (TP1, TP2)
 * - توصيات C: هدف إلى هدفين
 */
export function getSignalTargets(sig: TradingSignal): number[] {
  const quality = sig.quality || 'A';
  const score = sig.qualityScore || 85;
  const isBuy = sig.type.startsWith('BUY');

  const targets: number[] = [];

  // TP1
  if (typeof sig.tp1 === 'number' && !isNaN(sig.tp1)) {
    targets.push(sig.tp1);
  }

  // TP2 (مضاف لمعظم الجودات باستثناء الصفقات الضعيفة جداً)
  if (typeof sig.tp2 === 'number' && !isNaN(sig.tp2)) {
    if (quality === 'C' && score < 65) {
      // هدف واحد فقط للصفقات السريعة جداً ذات الجودة المنخفضة
    } else {
      targets.push(sig.tp2);
    }
  }

  // TP3 (خاص بالتوصيات القوية A و A+)
  if (typeof sig.tp3 === 'number' && !isNaN(sig.tp3)) {
    if (quality === 'A+' || quality === 'A' || score >= 80) {
      targets.push(sig.tp3);
    }
  }

  // TP4 (خاص بتوصيات A+ ذات التوافق المؤسسي العالي جداً 95%+)
  if (typeof sig.tp4 === 'number' && !isNaN(sig.tp4)) {
    targets.push(sig.tp4);
  } else if ((quality === 'A+' || score >= 95) && sig.tp3 && sig.tp2 && sig.tp1) {
    const step = Math.abs(sig.tp2 - sig.tp1) || Math.abs(sig.tp1 - sig.entry) || 10.0;
    const tp4 = isBuy ? sig.tp3 + step : sig.tp3 - step;
    targets.push(tp4);
  }

  return targets;
}

/**
 * 1. بطاقة إدراج توصية / أمر معلق جديد (New Institutional Signal Card)
 * بالشكل المخصص والمحدد بدقة وفق الجودة:
 * ⭐ القوة والجودة: A+ ★★★★★ (100% - SMC المؤسسي)
 * ⏰ الإطار الزمني: 1m | كسر هيكلي وسيولة BOS
 * 🟢 XAU/USD شراء LIMIT 🌀 (2650.00)
 * TP ✅ 2665.00
 * TP ✅ 2680.00
 * TP ✅ 2700.00
 * ....... وقف الخسارة: 2640.00
 */
export function formatPendingSignalTelegram(sig: TradingSignal): TelegramFormattedCard {
  const digits = MARKET_BASES[sig.market]?.digits || 2;
  const pairDisplay = getMarketPairSymbol(sig.market);
  const isBuy = sig.type.startsWith('BUY');
  const emoji = isBuy ? '🟢' : '🔴';
  const actionAr = isBuy ? 'شراء' : 'بيع';
  const isScalp = sig.isScalp !== false;
  const scalpBadge = isScalp ? '⚡ توصية سكلبينج LIMIT' : 'توصية مؤسسية SMC';
  const orderTypeKeyword = sig.type.includes('STOP') ? 'STOP' : 'LIMIT';
  const tf = sig.timeframe || '1m';
  const quality = sig.quality || 'A+';
  const qualityScore = sig.qualityScore || 100;
  const stars = getQualityStars(quality);

  // الأهداف ديناميكية حسب جودة التوصية
  const dynamicTargets = getSignalTargets(sig);

  const tpHtmlLines = dynamicTargets
    .map((tp, idx) => `TP${idx + 1} ✅ <code>${tp.toFixed(digits)}</code>`)
    .join('\n');

  const tpPlainLines = dynamicTargets
    .map((tp, idx) => `TP${idx + 1} ✅ ${tp.toFixed(digits)}`)
    .join('\n');

  const htmlText =
    `⭐ <b>القوة والجودة:</b> <b>${quality} ${stars}</b> (<b>${qualityScore}%</b> - ${scalpBadge})\n` +
    `⏰ <b>الإطار الزمني:</b> <code>${tf}</code> | سكلبينج ارتدادي وسيولة BOS\n` +
    `${emoji} <b>${pairDisplay} ${actionAr} ${orderTypeKeyword} 🌀 (${sig.entry.toFixed(digits)})</b>\n` +
    `${tpHtmlLines}\n` +
    `....... <b>وقف الخسارة:</b> <code>${sig.sl.toFixed(digits)}</code>`;

  const plainText =
    `⭐ القوة والجودة: ${quality} ${stars} (${qualityScore}% - ${scalpBadge})\n` +
    `⏰ الإطار الزمني: ${tf} | سكلبينج ارتدادي وسيولة BOS\n` +
    `${emoji} ${pairDisplay} ${actionAr} ${orderTypeKeyword} 🌀 (${sig.entry.toFixed(digits)})\n` +
    `${tpPlainLines}\n` +
    `....... وقف الخسارة: ${sig.sl.toFixed(digits)}`;

  return { plainText, htmlText };
}

/**
 * 2. بطاقة تفعيل الأمر ودخول السوق (Order Activated / Triggered)
 */
export function formatOrderActivatedTelegram(sig: TradingSignal): TelegramFormattedCard {
  const digits = MARKET_BASES[sig.market]?.digits || 2;
  const pairDisplay = getMarketPairSymbol(sig.market);
  const isBuy = sig.type.startsWith('BUY');
  const emoji = isBuy ? '🟢' : '🔴';
  const actionAr = isBuy ? 'شراء' : 'بيع';

  const htmlText =
    `🔵 <b>تحديث متابعة: تم تفعيل الأمر ودخول السوق!</b> 🚨\n` +
    `${emoji} <b>${pairDisplay} ${actionAr}</b> ➔ <b>مفعلة الآن في السوق (Active)</b>\n` +
    `💵 <b>سعر الدخول المنفذ:</b> <code>${sig.entry.toFixed(digits)}</code>\n` +
    `🛑 <b>وقف الخسارة الحالي:</b> <code>${sig.sl.toFixed(digits)}</code>\n` +
    `🎯 <b>الهدف الأول TP1:</b> <code>${sig.tp1.toFixed(digits)}</code>\n` +
    `⏱️ <i>الصفقة قيد التتبع الحي والمباشر على الشارت.</i>`;

  const plainText = `🔵 [تحديث متابعة] تفعيل ودخول السوق لـ ${pairDisplay} [${sig.type}] بسعر ${sig.entry.toFixed(digits)}! الصفقة نشطة الآن والهدف القادم ${sig.tp1.toFixed(digits)}.`;

  return { plainText, htmlText };
}

/**
 * 3. بطاقة تحقيق الأهداف (Take Profit Hit: TP1 / TP2 / TP3 / TP4)
 */
export function formatTPReachedTelegram(
  sig: TradingSignal,
  target: 'TP1' | 'TP2' | 'TP3' | 'TP4',
  points: number
): TelegramFormattedCard {
  const digits = MARKET_BASES[sig.market]?.digits || 2;
  const pairDisplay = getMarketPairSymbol(sig.market);
  const isBuy = sig.type.startsWith('BUY');
  const actionAr = isBuy ? 'شراء' : 'بيع';

  let targetPrice = sig.tp1;
  let targetAction = 'حجز 50% ونقل الوقف لنقطة الدخول (+5 نقاط تأمين Breakeven)';
  if (target === 'TP2') {
    targetPrice = sig.tp2;
    targetAction = 'حجز 75% من الأرباح ورفع الوقف المتحرك';
  } else if (target === 'TP3') {
    targetPrice = sig.tp3;
    targetAction = 'حجز الأرباح المتقدمة ومتابعة الاتجاه';
  } else if (target === 'TP4') {
    const step = Math.abs(sig.tp2 - sig.tp1) || Math.abs(sig.tp1 - sig.entry) || 10.0;
    targetPrice = isBuy ? sig.tp3 + step : sig.tp3 - step;
    targetAction = 'إغلاق كامل للصفقة 100% بأقصى ربح';
  }

  const htmlText =
    `🎯 <b>تحديث متابعة: تم تحقيق الهدف ${target} بنجاح! ✅</b>\n` +
    `📊 <b>الأصل:</b> <code>${pairDisplay}</code> [${actionAr}]\n` +
    `💰 <b>الربح المحقق:</b> <code>+${points} نقطة</code> 🚀\n` +
    `💵 <b>سعر الوصول:</b> <code>${targetPrice.toFixed(digits)}</code>\n` +
    `🛡️ <b>الإجراء التلقائي:</b> ${targetAction}`;

  const plainText = `🎯 [تحديث متابعة] تم ضرب الهدف ${target} لصفقة ${pairDisplay} (+${points} نقطة) @ ${targetPrice.toFixed(digits)}! ${targetAction}`;

  return { plainText, htmlText };
}

/**
 * 4. بطاقة التأمين الذكي والوقف المتحرك (Smart Trailing / Breakeven)
 */
export function formatTrailingAlertTelegram(sig: TradingSignal, trailAlertText: string): TelegramFormattedCard {
  const digits = MARKET_BASES[sig.market]?.digits || 2;
  const pairDisplay = getMarketPairSymbol(sig.market);

  const htmlText =
    `🛡️ <b>تحديث متابعة: تأمين ذكي وملاحقة الأرباح 🔒</b>\n` +
    `📊 <b>الأصل:</b> <code>${pairDisplay}</code>\n` +
    `📍 <b>تفاصيل التحديث:</b> ${trailAlertText}\n` +
    `🛡️ <b>الوقف الجديد (SL):</b> <code>${sig.sl.toFixed(digits)}</code>`;

  const plainText = `🛡️ [تحديث متابعة] تأمين ذكي لصفقة ${pairDisplay}: ${trailAlertText} | الوقف الجديد: ${sig.sl.toFixed(digits)}`;

  return { plainText, htmlText };
}

/**
 * 5. بطاقة ضرب وقف الخسارة أو الخروج المحمي (Stop Loss / Secured Exit)
 */
export function formatSLHitTelegram(sig: TradingSignal, points: number, isSecured: boolean): TelegramFormattedCard {
  const digits = MARKET_BASES[sig.market]?.digits || 2;
  const pairDisplay = getMarketPairSymbol(sig.market);
  const isBuy = sig.type.startsWith('BUY');
  const actionAr = isBuy ? 'شراء' : 'بيع';

  let htmlText = '';
  let plainText = '';

  if (isSecured) {
    htmlText =
      `🛡️ <b>تحديث متابعة: خروج على وقف الأرباح المحمي 🟢</b>\n` +
      `📊 <b>الأصل:</b> <code>${pairDisplay}</code> [${actionAr}]\n` +
      `💰 <b>النتيجة النهائية:</b> <code>+${points} نقطة</code> (أرباح صافية مؤمنة)\n` +
      `💵 <b>سعر الإغلاق:</b> <code>${sig.sl.toFixed(digits)}</code>\n` +
      `🛡️ <i>تم إغلاق الجزء المتبقي على تأمين الأرباح بعد تحقيق الأهداف السابقة.</i>`;

    plainText = `🛡️ [تحديث متابعة] خروج على وقف الأرباح المحمي لصفقة ${pairDisplay} (+${points} نقطة) @ ${sig.sl.toFixed(digits)}.`;
  } else {
    htmlText =
      `🛑 <b>تحديث متابعة: تم ضرب وقف الخسارة 🔴</b>\n` +
      `📊 <b>الأصل:</b> <code>${pairDisplay}</code> [${actionAr}]\n` +
      `📉 <b>النتيجة:</b> <code>${points} نقطة</code>\n` +
      `💵 <b>سعر الوقف:</b> <code>${sig.sl.toFixed(digits)}</code>\n` +
      `🛑 <i>الانضباط بوقف الخسارة لحماية رأس المال وفق قواعد SMC.</i>`;

    plainText = `🛑 [تحديث متابعة] تم ضرب وقف الخسارة لصفقة ${pairDisplay} (${points} نقطة) @ ${sig.sl.toFixed(digits)}.`;
  }

  return { plainText, htmlText };
}

/**
 * 6. بطاقة الإغلاق اليدوي (Manual Market Close)
 */
export function formatManualCloseTelegram(sig: TradingSignal, closePrice: number, points: number): TelegramFormattedCard {
  const digits = MARKET_BASES[sig.market]?.digits || 2;
  const pairDisplay = getMarketPairSymbol(sig.market);

  const htmlText =
    `🔔 <b>تحديث متابعة: إغلاق الصفقة بسعر السوق يدوياً</b>\n` +
    `📊 <b>الأصل:</b> <code>${pairDisplay}</code>\n` +
    `💵 <b>سعر الإغلاق:</b> <code>${closePrice.toFixed(digits)}</code>\n` +
    `💰 <b>النتيجة:</b> <code>${points >= 0 ? '+' : ''}${points} نقطة</code>`;

  const plainText = `🔔 [تحديث متابعة] إغلاق يدوي لصفقة ${pairDisplay} @ ${closePrice.toFixed(digits)} (${points >= 0 ? '+' : ''}${points} نقطة).`;

  return { plainText, htmlText };
}

/**
 * 7. بطاقة إلغاء الأمر المعلق (Order Cancelled)
 */
export function formatCancelAlertTelegram(sig: TradingSignal, reason?: string): TelegramFormattedCard {
  const digits = MARKET_BASES[sig.market]?.digits || 2;
  const pairDisplay = getMarketPairSymbol(sig.market);

  const htmlText =
    `❌ <b>تحديث متابعة: إلغاء الأمر المعلق</b>\n` +
    `📊 <b>الأصل:</b> <code>${pairDisplay}</code>\n` +
    `💵 <b>سعر الدخول الملغي:</b> <code>${sig.entry.toFixed(digits)}</code>\n` +
    `📋 <b>السبب:</b> ${reason || 'تغير حركة بنية السوق وتجاوز منطقة الدخول'}`;

  const plainText = `❌ [تحديث متابعة] تم إلغاء الأمر المعلق لـ ${pairDisplay} @ ${sig.entry.toFixed(digits)}.`;

  return { plainText, htmlText };
}

