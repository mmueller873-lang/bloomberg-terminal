import { redis } from "./redis";

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = "https://www.alphavantage.co/query";

// Track API call count to simulate when near limit (simplified)
let callCount = 0;
const MAX_CALLS = 5; // Alpha Vantage free tier limit per minute

export async function fetchMarketData(symbol: string) {
  try {
    // Check if we've exceeded rate limit
    if (callCount >= MAX_CALLS) {
      console.warn("Alpha Vantage rate limit reached, using simulation");
      return generateSimulatedData(symbol);
    }

    const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);
    callCount++;

    if (!response.ok) {
      throw new Error(`Alpha Vantage error: ${response.status}`);
    }

    const data = await response.json();
    const quote = data["Global Quote"];

    if (!quote || Object.keys(quote).length === 0) {
      // No data returned, simulate
      return generateSimulatedData(symbol);
    }

    return {
      symbol,
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["09. change"]),
      changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
      volume: parseInt(quote["06. volume"]),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error fetching from Alpha Vantage:", error);
    return generateSimulatedData(symbol);
  }
}

function generateSimulatedData(symbol: string) {
  // Deterministic simulation based on symbol and time
  const seed = symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
  const basePrice = 100 + (seed % 200);
  const change = (Math.sin(Date.now() / 10000) * 5).toFixed(2);
  const changePercent = ((parseFloat(change) / basePrice) * 100).toFixed(2);
  return {
    symbol,
    price: basePrice + parseFloat(change),
    change: parseFloat(change),
    changePercent: parseFloat(changePercent),
    volume: Math.floor(Math.random() * 10000000),
    timestamp: Date.now(),
  };
}

// Reset call count every minute (simplified, but in real app use sliding window)
setInterval(() => {
  callCount = 0;
}, 60000);

// --- NEW: Financial News ---
export async function fetchFinancialNews(query = "market", limit = 10) {
  try {
    // Alpha Vantage News API endpoint
    const url = `${BASE_URL}?function=NEWS_SENTIMENT&tickers=${query}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("News fetch failed");
    const data = await response.json();
    if (data.feed && data.feed.length > 0) {
      return data.feed.slice(0, limit).map((item: any) => ({
        title: item.title,
        summary: item.summary,
        url: item.url,
        time_published: item.time_published,
        source: item.source,
        source_domain: item.source_domain,
        banner_image: item.banner_image,
      }));
    }
    // Fallback to mock news
    return getMockNews(query);
  } catch (error) {
    console.error("Error fetching news:", error);
    return getMockNews(query);
  }
}

function getMockNews(query: string) {
  return [
    {
      title: `Market Update: ${query} shows strong momentum`,
      summary: `Analysts predict continued growth in ${query} sector.`,
      url: "#",
      time_published: new Date().toISOString(),
      source: "Mock News",
      source_domain: "mock.com",
    },
    {
      title: `Economic indicators point to stability in ${query}`,
      summary: `Recent data suggests low volatility for ${query}.`,
      url: "#",
      time_published: new Date().toISOString(),
      source: "Mock News",
      source_domain: "mock.com",
    },
  ];
}
