# 01 Data Ingestion

This component is responsible for the **Automated Data Ingestion** phase of the pipeline.

## Features
- Fetches real-time market data from **CoinGecko** and **CoinMarketCap**.
- Collects crypto-related news articles from various sources.
- Uses a background scheduler (`APScheduler`) to keep data fresh.
