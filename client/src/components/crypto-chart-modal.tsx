import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { SiBitcoin } from "react-icons/si";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TRX_ICON_URL = "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png";

interface CryptoChartModalProps {
  open: boolean;
  onClose: () => void;
}

interface CryptoPrice {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume: number;
}

interface ChartDataPoint {
  time: string;
  price: number;
}

export default function CryptoChartModal({ open, onClose }: CryptoChartModalProps) {
  const [activeTab, setActiveTab] = useState<'btc' | 'trx'>('btc');
  const [btcPrice, setBtcPrice] = useState<CryptoPrice | null>(null);
  const [trxPrice, setTrxPrice] = useState<CryptoPrice | null>(null);
  const [timeInterval, setTimeInterval] = useState('1h');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);

  useEffect(() => {
    if (!open) return;

    const fetchPrices = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tron&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_high_24h=true&include_low_24h=true'
        );
        const data = await response.json();
        
        if (data.bitcoin) {
          setBtcPrice({
            price: data.bitcoin.usd,
            change24h: data.bitcoin.usd_24h_change || 0,
            high24h: data.bitcoin.usd_24h_high || data.bitcoin.usd * 1.02,
            low24h: data.bitcoin.usd_24h_low || data.bitcoin.usd * 0.98,
            volume: data.bitcoin.usd_24h_vol || 0,
          });
        }
        
        if (data.tron) {
          setTrxPrice({
            price: data.tron.usd,
            change24h: data.tron.usd_24h_change || 0,
            high24h: data.tron.usd_24h_high || data.tron.usd * 1.02,
            low24h: data.tron.usd_24h_low || data.tron.usd * 0.98,
            volume: data.tron.usd_24h_vol || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch crypto prices:', error);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const fetchChartData = async () => {
      setIsLoadingChart(true);
      try {
        const coinId = activeTab === 'btc' ? 'bitcoin' : 'tron';
        const days = timeInterval === '1m' ? 0.04 : 
                     timeInterval === '30m' ? 0.02 : 
                     timeInterval === '1h' ? 1 : 7;
        
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
        );
        const data = await response.json();
        
        if (data.prices) {
          const formattedData = data.prices.map(([timestamp, price]: [number, number]) => {
            const date = new Date(timestamp);
            const timeStr = timeInterval === 'D' 
              ? `${date.getMonth() + 1}/${date.getDate()}`
              : `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            
            return {
              time: timeStr,
              price: price
            };
          });
          
          const step = Math.ceil(formattedData.length / 20);
          const sampledData = formattedData.filter((_: ChartDataPoint, index: number) => index % step === 0);
          
          setChartData(sampledData);
        }
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setIsLoadingChart(false);
      }
    };

    fetchChartData();
  }, [open, activeTab, timeInterval]);

  const currentPrice = activeTab === 'btc' ? btcPrice : trxPrice;
  const isPositive = (currentPrice?.change24h || 0) >= 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 border-purple-500/30 text-white p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 flex flex-row items-center justify-between border-b border-white/10">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            Live Crypto Charts
          </DialogTitle>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="button-close-chart"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('btc')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'btc'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              data-testid="tab-btc"
            >
              <SiBitcoin className="w-4 h-4" />
              Bitcoin (BTC)
            </button>
            <button
              onClick={() => setActiveTab('trx')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold transition-all ${
                activeTab === 'trx'
                  ? 'bg-red-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
              data-testid="tab-trx"
            >
              <img src={TRX_ICON_URL} alt="TRX" className="w-4 h-4 rounded-full" />
              Tron (TRX)
            </button>
          </div>

          {/* Live Price Display */}
          <div className="bg-black/40 rounded-xl p-4 border border-white/10">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {activeTab === 'btc' ? (
                    <SiBitcoin className="w-6 h-6 text-orange-500" />
                  ) : (
                    <img src={TRX_ICON_URL} alt="TRX" className="w-6 h-6 rounded-full" />
                  )}
                  <span className="text-sm text-white/70">
                    {activeTab === 'btc' ? 'Bitcoin / TetherUS' : 'Tron / TetherUS'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    {currentPrice ? currentPrice.price.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }) : '---'}
                  </span>
                  {currentPrice && (
                    <span className={`flex items-center gap-1 text-sm font-semibold ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(currentPrice.change24h).toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-green-400">LIVE</span>
              </div>
            </div>

            {/* Time Intervals */}
            <div className="flex items-center gap-1.5 mb-4">
              {['1m', '30m', '1h', 'D'].map((interval) => (
                <button
                  key={interval}
                  onClick={() => setTimeInterval(interval)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    timeInterval === interval
                      ? 'bg-white/20 text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {interval}
                </button>
              ))}
            </div>

            {/* Live Chart */}
            <div className="relative h-48 bg-black/60 rounded-lg border border-white/5 overflow-hidden">
              {isLoadingChart ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-xs text-white/50">Loading chart...</p>
                  </div>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="time" 
                      stroke="#ffffff40"
                      tick={{ fill: '#ffffff60', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#ffffff40"
                      tick={{ fill: '#ffffff60', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => `$${value.toFixed(activeTab === 'btc' ? 0 : 4)}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a2e', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [`$${value.toFixed(activeTab === 'btc' ? 2 : 6)}`, 'Price']}
                      labelStyle={{ color: '#ffffff80' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke={isPositive ? '#4ade80' : '#f87171'} 
                      strokeWidth={2}
                      dot={false}
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 text-white/40" />
                    <p className="text-sm text-white/60">No chart data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            {currentPrice ? (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs text-white/50 mb-1">24h High</p>
                  <p className="text-sm font-bold text-green-400">
                    ${currentPrice.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-2.5">
                  <p className="text-xs text-white/50 mb-1">24h Low</p>
                  <p className="text-sm font-bold text-red-400">
                    ${currentPrice.low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-2.5 col-span-2">
                  <p className="text-xs text-white/50 mb-1">24h Volume</p>
                  <p className="text-sm font-bold text-white">
                    ${(currentPrice.volume / 1000000).toFixed(2)}M
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
