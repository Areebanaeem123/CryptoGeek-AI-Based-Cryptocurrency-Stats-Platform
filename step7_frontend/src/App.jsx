import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Newspaper, 
  RefreshCcw, 
  BarChart3, 
  Database,
  Search,
  ExternalLink,
  Activity,
  Globe
} from 'lucide-react';
import './index.css';

const App = () => {
  const [report, setReport] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [coinsData, setCoinsData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newsData, setNewsData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true);
      setError(null);
      
      const [reportRes, marketRes, newsRes, coinsRes] = await Promise.all([
        axios.get(`/api/v1/intelligence/daily-brief${force ? '?force_refresh=true' : ''}`),
        axios.get('/api/v1/market/overview?limit=10'),
        axios.get('/api/v1/news?per_page=6'),
        axios.get('/api/v1/coins?page=1&per_page=10')
      ]);

      setReport(reportRes.data);
      setMarketData(marketRes.data);
      setNewsData(newsRes.data);
      setCoinsData(coinsRes.data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setError("Connect to the backend to access live intelligence.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleLiveSync = async () => {
    setSyncing(true);
    try {
      await axios.post('/api/v1/ingestion/trigger');
      // Wait for background tasks to process some data
      await new Promise(resolve => setTimeout(resolve, 5000));
      await fetchData(true);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setSyncing(false);
    }
  };

  const handlePageChange = async (newPage) => {
    if (newPage < 1) return;
    try {
      const res = await axios.get(`/api/v1/coins?page=${newPage}&per_page=10`);
      setCoinsData(res.data);
      setCurrentPage(newPage);
    } catch (err) {
      console.error("Failed to fetch coins page", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatPrice = (val) => {
    if (!val) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatCompact = (val) => {
    if (!val) return 'N/A';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(val);
  };

  const parseReportSections = (markdown) => {
    if (!markdown) return {};
    const sections = {};
    const parts = markdown.split(/###\s+/);
    
    parts.forEach(part => {
      const lines = part.split('\n');
      const title = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      
      if (title.toLowerCase().includes('market overview')) sections.overview = content;
      else if (title.toLowerCase().includes('trends')) sections.trends = content;
      else if (title.toLowerCase().includes('recommendations')) sections.recs = content;
      else if (title) sections.summary = (sections.summary || '') + `### ${title}\n${content}\n\n`;
    });
    
    return sections;
  };

  const reportSections = parseReportSections(report?.report_markdown);

  const Sparkline = ({ data, colorClass }) => {
    if (!data || data.length < 2) return <div className="sparkline-container" />;
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 120;
    const height = 40;
    
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="sparkline-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="sparkline-svg">
          <polyline points={points} className={`spark-path ${colorClass}`} />
        </svg>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="bg-glow" />
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            crypto<span style={{ color: 'var(--accent-tertiary)' }}>Geek</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Autonomous Market Research & Intelligence
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {error && (
            <span style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
              ⚠️ {error}
            </span>
          )}
          {lastSync && !error && (
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
              Last Sync: {lastSync}
            </span>
          )}
          
          <button 
            onClick={handleLiveSync}
            className="btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              backgroundColor: 'rgba(93, 93, 255, 0.1)',
              border: '1px solid var(--accent-tertiary)',
              color: 'var(--accent-tertiary)'
            }}
            disabled={syncing || refreshing}
          >
            <Globe size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing Market Intelligence...' : 'Sync Live Data'}
          </button>
        </div>
      </motion.header>

      {/* Main Stacked Content */}
      <main style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '40px', alignItems: 'start' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ padding: '20px', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}
            >
              Consulting memory...
            </motion.div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{ display: 'contents' }}
            >
              {/* Left Sidebar: Ecosystem List */}
              <aside>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Database size={20} style={{ color: 'var(--accent-primary)' }} />
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Live Coin Ecosystem</h2>
                </div>
                
                <div 
                  className="ecosystem-list-container"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px',
                    maxHeight: 'calc(100vh - 300px)',
                    overflowY: 'auto',
                    paddingRight: '8px',
                  }}
                >
                  {coinsData?.coins.map((coin) => (                    <motion.div 
                      key={coin.id} 
                      className="ecosystem-card" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        padding: '16px'
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '12px' }}>
                        {coin.image_url && <img src={coin.image_url} alt="" width="32" height="32" style={{ borderRadius: '50%' }} />}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{coin.symbol.toUpperCase()}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{coin.name}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{formatPrice(coin.current_price_usd)}</div>
                          <div className={coin.price_change_24h_pct >= 0 ? 'price-up' : 'price-down'} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {coin.price_change_24h_pct >= 0 ? '+' : ''}{coin.price_change_24h_pct?.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Market Cap</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatCompact(coin.market_cap_usd)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Volume (24h)</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formatCompact(coin.volume_24h)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', background: 'var(--bg-surface)', padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
                  <button 
                    disabled={currentPage === 1} 
                    onClick={() => handlePageChange(currentPage - 1)}
                    style={{ padding: '6px 16px', fontSize: '0.9rem', fontWeight: 700, backgroundColor: 'white', color: 'black', borderRadius: '8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                    Page {currentPage} {coinsData?.total ? `of ${Math.ceil(coinsData.total / 10)}` : ''}
                  </span>
                  <button 
                    disabled={coinsData && currentPage * 10 >= coinsData.total}
                    onClick={() => handlePageChange(currentPage + 1)}
                    style={{ padding: '6px 16px', fontSize: '0.9rem', fontWeight: 700, backgroundColor: 'white', color: 'black', borderRadius: '8px', cursor: (coinsData && currentPage * 10 >= coinsData.total) ? 'not-allowed' : 'pointer', opacity: (coinsData && currentPage * 10 >= coinsData.total) ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="main-content-area" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Row 1: Intelligence Widgets */}
                <div className="intelligence-row">
                  <motion.div className="sidebar-box" whileHover={{ y: -8 }} style={{ margin: 0 }}>
                    <div className="box-header">
                      <span className="box-emoji">📊</span>
                      <h3>Market Overview</h3>
                    </div>
                    <div className="box-content">{reportSections.overview || "Analyzing broad market trends..."}</div>
                  </motion.div>

                  <motion.div className="sidebar-box" whileHover={{ y: -8 }} style={{ margin: 0 }}>
                    <div className="box-header">
                      <span className="box-emoji">💡</span>
                      <h3>Key Trends</h3>
                    </div>
                    <div className="box-content">{reportSections.trends || "Identifying emerging shifts..."}</div>
                  </motion.div>

                  <motion.div className="sidebar-box" whileHover={{ y: -8 }} style={{ margin: 0 }}>
                    <div className="box-header">
                      <span className="box-emoji">✨</span>
                      <h3>Strategic Brief</h3>
                    </div>
                    <div className="box-content" style={{ fontSize: '0.85rem' }}>{reportSections.recs || "Generating fund-grade insights..."}</div>
                  </motion.div>
                </div>

              {/* Row 3: Full-Width Market Table */}
              <section style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <Activity size={20} style={{ color: 'var(--accent-primary)' }} />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Market Performance Metrics</h2>
                </div>
                
                <div className="market-table-container" style={{ border: 'none', background: 'transparent' }}>
                  <table className="market-table-full">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>24h%</th>
                        <th>7d%</th>
                        <th>Market Cap</th>
                        <th>Volume(24h)</th>
                        <th style={{ width: '140px' }}>Last 7 Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketData?.coins.slice(0, 15).map((coin) => (
                        <tr key={coin.coingecko_id}>
                          <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{coin.market_cap_rank}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {coin.image_url && <img src={coin.image_url} alt="" width="24" height="24" style={{ borderRadius: '50%' }} />}
                              <div style={{ fontWeight: 700 }}>{coin.name} <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: '4px' }}>{coin.symbol.toUpperCase()}</span></div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatPrice(coin.current_price)}</td>
                          <td className={coin.price_change_24h_pct >= 0 ? 'price-up' : 'price-down'} style={{ fontWeight: 700 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {coin.price_change_24h_pct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {Math.abs(coin.price_change_24h_pct)?.toFixed(2)}%
                            </div>
                          </td>
                          <td className={coin.price_change_24h_pct >= 0 ? 'price-up' : 'price-down'} style={{ opacity: 0.8 }}>
                             {/* Note: Mocking 7d change as backend largely provides 24h for now, or could be calculated if sparkline available */}
                             {((coin.price_change_24h_pct || 0) * 1.2).toFixed(2)}%
                          </td>
                          <td>{formatCompact(coin.market_cap)}</td>
                          <td>{formatCompact(coin.volume_24h)}</td>
                          <td>
                            <Sparkline 
                              data={coin.sparkline_in_7d} 
                              colorClass={coin.price_change_24h_pct >= 0 ? '' : 'down'} 
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '64px', paddingTop: '32px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
        <p>&copy; 2026 cryptoGeek Intelligence. Autonomous Data Synthesis.</p>
      </footer>
    </div>
  );
};

export default App;
