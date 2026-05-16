import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  X,
  MessageSquare,
  Send,
  User
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
  
  const [showSentimentModal, setShowSentimentModal] = useState(false);
  const [sentimentSymbol, setSentimentSymbol] = useState('');
  const [sentimentResult, setSentimentResult] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySymbol, setHistorySymbol] = useState('');
  const [historyTimeframe, setHistoryTimeframe] = useState('24h');
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotSymbol, setSnapshotSymbol] = useState('');
  const [snapshotData, setSnapshotData] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  const [showChatMode, setShowChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 12));
  const messagesEndRef = useRef(null);

  const fetchData = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true);
      setError(null);
      
      const [reportRes, newsRes, coinsRes] = await Promise.all([
        axios.get('/api/v1/intelligence/daily-brief').catch(() => ({ data: report })),
        axios.get('/api/v1/news?page=1&per_page=5').catch(() => ({ data: newsData })),
        axios.get(`/api/v1/coins?page=${currentPage}&per_page=10`).catch(() => ({ data: coinsData })),
      ]);

      if (reportRes?.data) setReport(reportRes.data);
      if (newsRes?.data) setNewsData(newsRes.data);
      if (coinsRes?.data) setCoinsData(coinsRes.data);
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

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await axios.post('/api/v1/chat/', {
        message: userMsg.text,
        session_id: sessionId
      });
      
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: res.data.answer,
        sources: res.data.sources
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I apologize, but I encountered an error connecting to the intelligence cluster. Please try again.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSentimentSearch = async (e) => {
    e.preventDefault();
    if (!sentimentSymbol.trim()) return;
    setSentimentLoading(true);
    setSentimentResult(null);
    try {
      const res = await axios.get(`/api/v1/intelligence/sentiment/${sentimentSymbol.toUpperCase()}`);
      setSentimentResult(res.data);
    } catch (err) {
      console.error("Failed to fetch sentiment", err);
      setSentimentResult({ error: "Failed to fetch sentiment data or coin not found." });
    } finally {
      setSentimentLoading(false);
    }
  };

  const handleHistorySearch = async (e) => {
    e.preventDefault();
    if (!historySymbol.trim()) return;
    setHistoryLoading(true);
    setHistoryData(null);
    try {
      const res = await axios.get(`/api/v1/market/prices/${historySymbol.toLowerCase()}?timeframe=${historyTimeframe}`);
      setHistoryData(res.data);
    } catch (err) {
      console.error("Failed to fetch history", err);
      setHistoryData({ error: "Failed to fetch price history data. Make sure to use the exact coingecko_id (e.g. bitcoin, ethereum)." });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSnapshotSearch = async (e) => {
    e.preventDefault();
    if (!snapshotSymbol.trim()) return;
    setSnapshotLoading(true);
    setSnapshotData(null);
    try {
      const res = await axios.get(`/api/v1/market/data/${snapshotSymbol.toLowerCase()}`);
      setSnapshotData(res.data);
    } catch (err) {
      console.error("Failed to fetch market snapshot", err);
      setSnapshotData({ error: "Failed to fetch snapshot data. Make sure to use the exact coingecko_id." });
    } finally {
      setSnapshotLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, chatLoading]);

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
            onClick={() => setShowSentimentModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <TrendingUp size={16} style={{ color: '#00FF94' }} /> Market Pulse
          </button>
          <button 
            onClick={() => setShowHistoryModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <TrendingDown size={16} style={{ color: '#00D1FF' }} /> Price History
          </button>
          <button 
            onClick={() => setShowSnapshotModal(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <Database size={16} style={{ color: '#FFB800' }} /> Market Snapshot
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
                    {reportSections?.overview ? reportSections.overview : "Analyzing market metrics..."}
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
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: 'calc(100vh - 480px)', overflowY: 'auto', paddingRight: '8px', paddingBottom: '20px' }}>
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
                {reportSections?.trends ? reportSections.trends : "Identifying emerging shifts..."}
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
                {reportSections?.recs ? reportSections.recs : "Generating fund-grade insights..."}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Market Pulse Selection Modal */}
      <AnimatePresence>
        {showSentimentModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSentimentModal(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowSentimentModal(false);
                  setSentimentSymbol('');
                  setSentimentResult(null);
                }}
              >
                <X size={18} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <TrendingUp size={24} style={{ color: '#00FF94' }} />
                <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-main)', textTransform: 'none' }}>Market Pulse</h2>
              </div>
              
              <form onSubmit={handleSentimentSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <input
                  type="text"
                  placeholder="Enter Coin Symbol (e.g. BTC)..."
                  value={sentimentSymbol}
                  onChange={(e) => setSentimentSymbol(e.target.value)}
                  style={{ flex: 1, backgroundColor: 'var(--bg-obsidian)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-main)', outline: 'none' }}
                />
                <button 
                  type="submit" 
                  disabled={sentimentLoading || !sentimentSymbol.trim()}
                  className="btn-primary"
                  style={{ borderRadius: '12px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Search size={16} /> Analyze
                </button>
              </form>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', marginTop: '-12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', alignSelf: 'center', marginRight: '4px' }}>Try exploring:</span>
                {['bitcoin', 'ethereum', 'solana', 'ripple', 'cardano'].map(coin => (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => setSentimentSymbol(coin)}
                    style={{
                      background: 'rgba(0, 255, 148, 0.1)',
                      border: '1px solid rgba(0, 255, 148, 0.2)',
                      color: 'var(--accent-primary)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {coin}
                  </button>
                ))}
              </div>

              {sentimentLoading && (
                <div style={{ padding: '40px', display: 'flex', justifySelf: 'center', justifyContent: 'center' }}>
                  <Globe className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
                </div>
              )}

              {sentimentResult && !sentimentLoading && !sentimentResult.error && (
                <div style={{ background: 'var(--bg-obsidian)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.4rem', margin: 0 }}>{sentimentResult.coin_symbol} Analysis</h3>
                    <span style={{ 
                      padding: '6px 12px', 
                      borderRadius: '8px', 
                      fontWeight: 700, 
                      fontSize: '0.85rem',
                      background: sentimentResult.overall_sentiment.toLowerCase() === 'bullish' ? 'rgba(0, 255, 148, 0.1)' : 
                                  sentimentResult.overall_sentiment.toLowerCase() === 'bearish' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: sentimentResult.overall_sentiment.toLowerCase() === 'bullish' ? 'var(--accent-primary)' : 
                             sentimentResult.overall_sentiment.toLowerCase() === 'bearish' ? 'var(--accent-secondary)' : 'var(--text-dim)'
                    }}>
                      {sentimentResult.overall_sentiment.toUpperCase()} ({sentimentResult.sentiment_score?.toFixed(2)})
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                    {sentimentResult.summary}
                  </p>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>
                    Based on recent {sentimentResult.article_count} intelligence articles.
                  </p>
                </div>
              )}

              {sentimentResult?.error && (
                <div style={{ padding: '20px', color: 'var(--accent-secondary)', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                  {sentimentResult.error}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Price History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistorySymbol('');
                  setHistoryData(null);
                }}
              >
                <X size={18} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <TrendingDown size={24} style={{ color: '#00D1FF' }} />
                <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-main)', textTransform: 'none' }}>Price History</h2>
              </div>
              
              <form onSubmit={handleHistorySearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <input
                  type="text"
                  placeholder="CoinGecko ID (e.g. bitcoin)..."
                  value={historySymbol}
                  onChange={(e) => setHistorySymbol(e.target.value)}
                  style={{ flex: 1, backgroundColor: 'var(--bg-obsidian)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-main)', outline: 'none' }}
                />
                <select 
                  value={historyTimeframe} 
                  onChange={(e) => setHistoryTimeframe(e.target.value)}
                  style={{ backgroundColor: 'var(--bg-obsidian)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-main)', outline: 'none' }}
                >
                  <option value="1h">1 Hour</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="90d">90 Days</option>
                </select>
                <button 
                  type="submit" 
                  disabled={historyLoading || !historySymbol.trim()}
                  className="btn-primary"
                  style={{ borderRadius: '12px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Search size={16} /> Fetch
                </button>
              </form>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', marginTop: '-12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', alignSelf: 'center', marginRight: '4px' }}>Try exploring:</span>
                {['bitcoin', 'ethereum', 'solana', 'ripple', 'cardano'].map(coin => (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => setHistorySymbol(coin)}
                    style={{
                      background: 'rgba(0, 209, 255, 0.1)',
                      border: '1px solid rgba(0, 209, 255, 0.2)',
                      color: '#00D1FF',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {coin}
                  </button>
                ))}
              </div>

              {historyLoading && (
                <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                  <Globe className="animate-spin" size={32} style={{ color: '#00D1FF' }} />
                </div>
              )}

              {historyData && !historyLoading && !historyData.error && (
                <div style={{ background: 'var(--bg-obsidian)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.4rem', margin: 0 }}>{historyData.symbol ? historyData.symbol.toUpperCase() : historySymbol}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      {historyData.prices?.length} Snapshots
                    </span>
                  </div>
                  
                  {historyData.prices && historyData.prices.length > 0 ? (
                    <div>
                      <div style={{ height: '80px', marginBottom: '32px', position: 'relative' }}>
                        <Sparkline data={historyData.prices.map(p => p.price_usd)} colorClass={historyData.prices[historyData.prices.length-1].price_usd >= historyData.prices[0].price_usd ? 'price-up' : 'price-down'} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Start</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '4px' }}>{formatPrice(historyData.prices[0].price_usd)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Current / End</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: '4px' }}>{formatPrice(historyData.prices[historyData.prices.length-1].price_usd)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)' }}>No pricing history data found for {historyTimeframe}.</div>
                  )}
                </div>
              )}

              {historyData?.error && (
                <div style={{ padding: '20px', color: 'var(--accent-secondary)', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                  {historyData.error}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Market Snapshot Modal */}
      <AnimatePresence>
        {showSnapshotModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSnapshotModal(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowSnapshotModal(false);
                  setSnapshotSymbol('');
                  setSnapshotData(null);
                }}
              >
                <X size={18} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Database size={24} style={{ color: '#FFB800' }} />
                <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--text-main)', textTransform: 'none' }}>Market Snapshot</h2>
              </div>
              
              <form onSubmit={handleSnapshotSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <input
                  type="text"
                  placeholder="CoinGecko ID (e.g. bitcoin)..."
                  value={snapshotSymbol}
                  onChange={(e) => setSnapshotSymbol(e.target.value)}
                  style={{ flex: 1, backgroundColor: 'var(--bg-obsidian)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-main)', outline: 'none' }}
                />
                <button 
                  type="submit" 
                  disabled={snapshotLoading || !snapshotSymbol.trim()}
                  className="btn-primary"
                  style={{ borderRadius: '12px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Search size={16} /> Fetch
                </button>
              </form>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', marginTop: '-12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', alignSelf: 'center', marginRight: '4px' }}>Try exploring:</span>
                {['bitcoin', 'ethereum', 'solana', 'ripple', 'cardano'].map(coin => (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => setSnapshotSymbol(coin)}
                    style={{
                      background: 'rgba(255, 184, 0, 0.1)',
                      border: '1px solid rgba(255, 184, 0, 0.2)',
                      color: '#FFB800',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {coin}
                  </button>
                ))}
              </div>

              {snapshotLoading && (
                <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                  <Globe className="animate-spin" size={32} style={{ color: '#FFB800' }} />
                </div>
              )}

              {snapshotData && !snapshotLoading && !snapshotData.error && (
                <div style={{ background: 'var(--bg-obsidian)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.4rem', margin: 0 }}>{snapshotSymbol.toUpperCase()} Snapshot</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', padding: '4px 10px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      Rank: #{snapshotData.market_cap_rank || 'N/A'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Market Cap</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>{formatPrice(snapshotData.market_cap_usd)}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>24h Range</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 600 }}>{formatCompact(snapshotData.low_24h)} - {formatCompact(snapshotData.high_24h)}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>All-Time High</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{formatPrice(snapshotData.ath)}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {snapshotData.ath_change_pct?.toFixed(2)}% • {new Date(snapshotData.ath_date).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>All-Time Low</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>{formatPrice(snapshotData.atl)}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        +{snapshotData.atl_change_pct?.toFixed(2)}% • {new Date(snapshotData.atl_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Circulating</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>{formatCompact(snapshotData.circulating_supply)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>{formatCompact(snapshotData.total_supply)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Max Supply</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>{snapshotData.max_supply ? formatCompact(snapshotData.max_supply) : '∞'}</span>
                    </div>
                  </div>
                </div>
              )}

              {snapshotData?.error && (
                <div style={{ padding: '20px', color: 'var(--accent-secondary)', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                  {snapshotData.error}
                </div>
              )}
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
      
      {/* Floating Chat Widget */}
      <motion.button 
        className="btn-primary"
        onClick={() => setShowChatMode(!showChatMode)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ 
          position: 'fixed', 
          bottom: '32px', 
          right: '32px', 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0, 255, 148, 0.4)',
          zIndex: 1000,
          padding: 0
        }}
      >
        {showChatMode ? <X size={28} /> : <MessageSquare size={28} />}
      </motion.button>

      <AnimatePresence>
        {showChatMode && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '110px',
              right: '32px',
              width: '380px',
              height: '600px',
              maxHeight: 'calc(100vh - 140px)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Chat Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '10px', background: 'rgba(0, 255, 148, 0.1)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>AI Copilot</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-dim)' }}>Powered by Real-Time RAG</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                  <p style={{ fontSize: '0.95rem', lineHeight: '1.5', maxWidth: '80%' }}>Hello! I'm your crypto intelligence agent. How can I assist you with market data or news today?</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ 
                    maxWidth: '85%', 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    backgroundColor: msg.role === 'user' ? 'rgba(0, 255, 148, 0.1)' : 'var(--bg-obsidian)',
                    border: msg.role === 'user' ? '1px solid rgba(0, 255, 148, 0.2)' : '1px solid var(--border-subtle)',
                    color: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--text-main)',
                    fontSize: '0.95rem',
                    lineHeight: '1.5'
                  }}>
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: 'var(--bg-obsidian)', border: '1px solid var(--border-subtle)', borderRadius: '8px', maxWidth: '85%' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 700 }}>Sources used</div>
                      {msg.sources.map((src, idx) => (
                        <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', marginTop: '4px' }}>
                          <ExternalLink size={12} style={{ color: 'var(--accent-primary)' }} />
                          <a href={src.url || '#'} target={src.url ? '_blank' : '_self'} rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {src.title}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', padding: '12px' }}>
                  <Globe size={16} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.9rem' }}>Analyzing blockchain data...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', gap: '12px' }}>
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                placeholder="Ask about market trends..." 
                disabled={chatLoading}
                style={{ 
                  flex: 1, 
                  backgroundColor: 'var(--bg-obsidian)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '12px', 
                  padding: '12px 16px', 
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontSize: '0.95rem'
                }}
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatInput.trim()}
                className="btn-primary"
                style={{ width: '48px', height: '48px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
