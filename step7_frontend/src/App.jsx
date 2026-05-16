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
  Globe,
  X
} from 'lucide-react';
import './index.css';

const App = () => {
  const [report, setReport] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [coinsData, setCoinsData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newsData, setNewsData] = useState(null);
  const [newsPage, setNewsPage] = useState(1);
  
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [coinModalLoading, setCoinModalLoading] = useState(false);
  
  const [showKeyTrendsModal, setShowKeyTrendsModal] = useState(false);
  const [showStrategicBriefModal, setShowStrategicBriefModal] = useState(false);
  
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
        axios.get('/api/v1/intelligence/daily-brief'),
        axios.get('/api/v1/market/overview?limit=10'),
        axios.get('/api/v1/news?page=1&per_page=5'),
        axios.get(`/api/v1/coins?page=${currentPage}&per_page=10`),
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

  const handleNewsPageChange = async (newPage) => {
    if (newPage < 1) return;
    try {
      const res = await axios.get(`/api/v1/news?page=${newPage}&per_page=5`);
      setNewsData(res.data);
      setNewsPage(newPage);
    } catch (err) {
      console.error("Failed to fetch news page", err);
    }
  };

  const handleCoinClick = async (coinId) => {
    setCoinModalLoading(true);
    setSelectedCoin({ id: coinId });
    try {
      const res = await axios.get(`/api/v1/coins/${coinId}`);
      setSelectedCoin(res.data);
    } catch (err) {
      console.error("Failed to fetch coin details", err);
    } finally {
      setCoinModalLoading(false);
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
            onClick={() => setShowKeyTrendsModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <Activity size={16} style={{ color: 'var(--accent-primary)' }} /> Key Trends
          </button>
          <button 
            onClick={() => setShowStrategicBriefModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <Sparkles size={16} style={{ color: '#F8B500' }} /> Strategic Brief
          </button>

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
            {syncing ? 'Syncing...' : 'Sync Live'}
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
                  {coinsData?.coins.map((coin) => (
                    <motion.div 
                      key={coin.id} 
                      className="ecosystem-card" 
                      onClick={() => handleCoinClick(coin.coingecko_id)}
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

              {/* Center Main Content Area */}
              <div className="main-content-area" style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                
                {/* Market Overview Headline */}
                <div className="market-overview-headline" style={{ padding: '20px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <BarChart3 size={24} style={{ color: 'var(--accent-primary)' }} />
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #F4F4F5, #A1A1AA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      Market Overview
                    </h1>
                  </div>
                  <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    {report?.market_overview ? report.market_overview : "Analyzing market metrics..."}
                  </p>
                </div>

              {/* Row 2: News Articles */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Newspaper size={20} style={{ color: 'var(--accent-primary)' }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Grab Latest Crypto News</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      disabled={newsPage === 1} 
                      onClick={() => handleNewsPageChange(newsPage - 1)}
                      style={{ padding: '6px 12px', background: 'var(--text-main)', color: 'var(--bg-obsidian)', borderRadius: '6px', fontWeight: 600, opacity: newsPage === 1 ? 0.5 : 1, cursor: newsPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                    >
                      Prev
                    </button>
                    <button 
                      onClick={() => handleNewsPageChange(newsPage + 1)}
                      disabled={!newsData || (newsPage * newsData.per_page >= newsData.total)}
                      style={{ padding: '6px 12px', background: 'var(--text-main)', color: 'var(--bg-obsidian)', borderRadius: '6px', fontWeight: 600, opacity: (!newsData || (newsPage * newsData.per_page >= newsData.total)) ? 0.5 : 1, cursor: (!newsData || (newsPage * newsData.per_page >= newsData.total)) ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                    >
                      Next
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: 'calc(100vh - 380px)', overflowY: 'auto', paddingRight: '8px' }}>
                  {newsData?.articles?.map((article) => (
                    <motion.div 
                      key={article.id} 
                      className="ecosystem-card news-card" 
                      style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', padding: '24px' }}
                      onClick={() => article.url ? window.open(article.url, '_blank') : null}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <span className="news-source">{article.source}</span>
                        {article.sentiment && (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            padding: '4px 10px', 
                            borderRadius: '6px',
                            fontWeight: 700,
                            background: article.sentiment.toLowerCase() === 'positive' || article.sentiment.toLowerCase() === 'bullish' ? 'rgba(0, 255, 148, 0.1)' : 
                                        article.sentiment.toLowerCase() === 'negative' || article.sentiment.toLowerCase() === 'bearish' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            color: article.sentiment.toLowerCase() === 'positive' || article.sentiment.toLowerCase() === 'bullish' ? 'var(--accent-primary)' : 
                                   article.sentiment.toLowerCase() === 'negative' || article.sentiment.toLowerCase() === 'bearish' ? 'var(--accent-secondary)' : 'var(--text-dim)'
                          }}>
                            {article.sentiment.toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <a href={article.url || '#'} target={article.url ? '_blank' : '_self'} rel="noreferrer" className="news-title" style={{ fontSize: '1.25rem', margin: '4px 0' }}>
                        {article.title}
                      </a>
                      
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '4px' }}>
                        {article.content}
                      </p>
                      
                      <div className="news-meta" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                        <span>{article.published_at ? new Date(article.published_at).toLocaleString() : new Date(article.created_at).toLocaleString()}</span>
                        {article.currencies && article.currencies.length > 0 && (
                          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{article.currencies.join(', ')}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              </div>

            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '24px', paddingTop: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
        <p>&copy; 2026 cryptoGeek Intelligence. Autonomous Data Synthesis.</p>
      </footer>
      
      {/* Key Trends Modal */}
      <AnimatePresence>
        {showKeyTrendsModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowKeyTrendsModal(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setShowKeyTrendsModal(false)}>
                <X size={18} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Activity size={24} style={{ color: 'var(--accent-primary)' }} />
                <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-main)', textTransform: 'none' }}>Key Trends</h2>
              </div>
              <div style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                {report?.key_trends ? report.key_trends : "Identifying emerging shifts..."}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strategic Brief Modal */}
      <AnimatePresence>
        {showStrategicBriefModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStrategicBriefModal(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setShowStrategicBriefModal(false)}>
                <X size={18} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Sparkles size={24} style={{ color: '#F8B500' }} />
                <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-main)', textTransform: 'none' }}>Strategic Brief</h2>
              </div>
              <div style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                {report?.strategic_recommendations ? report.strategic_recommendations : "Generating fund-grade insights..."}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Coin Details Modal */}
      <AnimatePresence>
        {selectedCoin && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCoin(null)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setSelectedCoin(null)}>
                <X size={18} />
              </button>
              
              {coinModalLoading && !selectedCoin.name ? (
                <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe className="animate-spin" size={24} style={{ color: 'var(--accent-tertiary)' }} />
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    {selectedCoin.image_url && <img src={selectedCoin.image_url} alt="" width="48" height="48" style={{ borderRadius: '50%' }} />}
                    <div>
                      <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-main)', textTransform: 'none' }}>{selectedCoin.name}</h2>
                      <div style={{ color: 'var(--text-dim)', fontWeight: 700, fontSize: '1rem', marginTop: '4px' }}>{selectedCoin.symbol?.toUpperCase()}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: 'var(--bg-obsidian)', padding: '24px', borderRadius: '16px' }}>
                    <div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Current Price</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatPrice(selectedCoin.current_price_usd)}</div>
                      <div className={selectedCoin.price_change_24h_pct >= 0 ? 'price-up' : 'price-down'} style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>
                        {selectedCoin.price_change_24h_pct >= 0 ? '+' : ''}{selectedCoin.price_change_24h_pct?.toFixed(2)}% (24h)
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Market Cap</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCompact(selectedCoin.market_cap_usd)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Volume (24h)</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCompact(selectedCoin.volume_24h)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
