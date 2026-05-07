import { useState, useEffect } from 'react';
import './DailyQuote.css';

const quotes = [
  { text: "Productivity is never an accident. It is always the result of a commitment to excellence.", author: "Paul J. Meyer" },
  { text: "Do the difficult things while they are easy and do the great things while they are small.", author: "Lao Tzu" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "The secret of your success is found in your daily routine.", author: "John C. Maxwell" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" }
];

export default function DailyQuote() {
  const [quote, setQuote] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const storedQuote = localStorage.getItem('dailyQuote');
    const storedDate = localStorage.getItem('quoteDate');
    const today = new Date().toDateString();

    if (storedQuote && storedDate === today) {
      setQuote(JSON.parse(storedQuote));
    } else {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setQuote(randomQuote);
      localStorage.setItem('dailyQuote', JSON.stringify(randomQuote));
      localStorage.setItem('quoteDate', today);
    }
  }, []);

  const refreshQuote = () => {
    setIsRefreshing(true);
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
    localStorage.setItem('dailyQuote', JSON.stringify(randomQuote));
    setTimeout(() => setIsRefreshing(false), 300);
  };

  if (!quote) return null;

  return (
    <div className={`daily-quote ${isRefreshing ? 'refreshing' : ''}`}>
      <div className="quote-icon">💡</div>
      <div className="quote-content">
        <p className="quote-text">"{quote.text}"</p>
        <p className="quote-author">— {quote.author}</p>
      </div>
      <button className="quote-refresh" onClick={refreshQuote} title="New quote">
        🔄
      </button>
    </div>
  );
}