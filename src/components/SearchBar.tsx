import { useState, useEffect, useRef } from 'react';
import styles from './SearchBar.module.css';

const API_URL = 'https://web-production-95ea.up.railway.app';

interface AskResponse {
  answer: string;
  sources: {
    text: string;
    score: number;
    metadata: Record<string, any>;
  }[];
}

interface AskState {
  isLoading: boolean;
  answer: string | null;
  sources: AskResponse['sources'] | null;
  error: string | null;
}

export default function SearchBar() {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [dealQuery, setDealQuery] = useState('');
  const [sessionId] = useState(() => crypto.randomUUID());
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);
  const [deals, setDeals] = useState<string[]>([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [highlightedDeal, setHighlightedDeal] = useState<number>(-1);
  const [askResult, setAskResult] = useState<AskState>({
    isLoading: false,
    answer: null,
    sources: null,
    error: null
  });

  // Filter deals based on query
  const filteredDeals = deals.filter(deal => 
    deal.toLowerCase().includes(dealQuery.toLowerCase())
  );

  useEffect(() => {
    // Fetch available deals when component mounts
    const fetchDeals = async () => {
      try {
        setIsLoadingDeals(true);
        setDealsError(null);
        console.log('Fetching deals from:', `${API_URL}/deals`);
        const response = await fetch(`${API_URL}/deals`);
        if (!response.ok) throw new Error('Failed to fetch deals');
        const data = await response.json();
        console.log('Received deals:', data);
        setDeals(data.deals);
      } catch (error) {
        console.error('Error fetching deals:', error);
        setDealsError(error instanceof Error ? error.message : 'Failed to fetch deals');
      } finally {
        setIsLoadingDeals(false);
      }
    };
    fetchDeals();
  }, []);

  const handleDealKeyDown = (e: React.KeyboardEvent) => {
    if (!filteredDeals.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (highlightedDeal < filteredDeals.length - 1) {
          const newIndex = highlightedDeal + 1;
          setHighlightedDeal(newIndex);
          
          // Ensure the newly highlighted item is visible
          const dropdown = dropdownRef.current;
          const highlightedElement = dropdown?.querySelector(`[data-index="${newIndex}"]`);
          
          if (dropdown && highlightedElement) {
            const dropdownRect = dropdown.getBoundingClientRect();
            const elementRect = highlightedElement.getBoundingClientRect();
            
            if (elementRect.bottom > dropdownRect.bottom) {
              highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (highlightedDeal > 0) {
          const newIndex = highlightedDeal - 1;
          setHighlightedDeal(newIndex);
          
          // Ensure the newly highlighted item is visible
          const dropdown = dropdownRef.current;
          const highlightedElement = dropdown?.querySelector(`[data-index="${newIndex}"]`);
          
          if (dropdown && highlightedElement) {
            const dropdownRect = dropdown.getBoundingClientRect();
            const elementRect = highlightedElement.getBoundingClientRect();
            
            if (elementRect.top < dropdownRect.top) {
              highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredDeals[highlightedDeal]) {
          selectDeal(filteredDeals[highlightedDeal]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setDealQuery('');
        break;
    }
  };

  const selectDeal = async (dealName: string) => {
    try {
      const response = await fetch(`${API_URL}/select-deal/${sessionId}/${encodeURIComponent(dealName)}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to select deal');
      setSelectedDeal(dealName);
      setQuery('');
      setAskResult({
        isLoading: false,
        answer: null,
        sources: null,
        error: null
      });
    } catch (error) {
      console.error('Error selecting deal:', error);
    }
  };

  const askQuestion = async (question: string) => {
    if (!selectedDeal) return;
    
    try {
      setAskResult({
        isLoading: true,
        answer: null,
        sources: null,
        error: null
      });
      
      const response = await fetch(`${API_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: question,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data: AskResponse = await response.json();
      setAskResult({
        isLoading: false,
        answer: data.answer,
        sources: data.sources,
        error: null
      });
    } catch (error) {
      setAskResult({
        isLoading: false,
        answer: null,
        sources: null,
        error: error instanceof Error ? error.message : 'Failed to get answer'
      });
    }
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchWrapper}>
        {!selectedDeal ? (
          <div className={styles.dealSelectionContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="What deal would you like to talk about?"
              value={dealQuery}
              onChange={(e) => setDealQuery(e.target.value)}
              onKeyDown={handleDealKeyDown}
            />
            {isLoadingDeals ? (
              <div className={styles.dealsDropdown}>
                <div className={styles.dealsLoading}>Loading available deals...</div>
              </div>
            ) : dealsError ? (
              <div className={styles.dealsDropdown}>
                <div className={styles.dealsError}>{dealsError}</div>
              </div>
            ) : filteredDeals.length === 0 ? (
              <div className={styles.dealsDropdown}>
                <div className={styles.dealsEmpty}>
                  {dealQuery ? 'No matching deals found' : 'No deals available'}
                </div>
              </div>
            ) : (
              <div className={styles.dealsDropdown} ref={dropdownRef}>
                {filteredDeals.map((deal, index) => (
                  <div
                    key={deal}
                    data-index={index}
                    className={`${styles.dealOption} ${index === highlightedDeal ? styles.highlighted : ''}`}
                    onClick={() => selectDeal(deal)}
                  >
                    {deal}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={styles.selectedDeal}>
              <span>Selected Deal: {selectedDeal}</span>
              <button 
                className={styles.changeDealButton}
                onClick={() => setSelectedDeal(null)}
              >
                Change Deal
              </button>
            </div>
            <input
              type="text"
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  e.preventDefault();
                  askQuestion(query.trim());
                }
              }}
              placeholder="Ask a question..."
            />
            
            <div className={styles.resultsContainer}>
              {askResult.isLoading ? (
                <div className={styles.contentContainer}>
                  <div className={styles.answerLoading}>
                    Thinking...
                  </div>
                </div>
              ) : askResult.error ? (
                <div className={styles.contentContainer}>
                  <div className={`${styles.answerPanel} ${styles.hasContent}`}>
                    <div className={styles.answerError}>
                      {askResult.error}
                    </div>
                  </div>
                </div>
              ) : askResult.answer ? (
                <div className={styles.contentContainer}>
                  <div className={`${styles.answerPanel} ${styles.hasContent}`}>
                    <div className={styles.answer}>
                      <h3>Answer</h3>
                      <p>{askResult.answer}</p>
                    </div>
                  </div>
                  {askResult.sources && askResult.sources.length > 0 && (
                    <div className={styles.sourcesPanel}>
                      <h4>Sources ({askResult.sources.length})</h4>
                      <div className={styles.sourcesList}>
                        {askResult.sources.map((source, index) => (
                          <div key={index} className={styles.source}>
                            <div className={styles.metadataItem}>
                              <span className={styles.metadataLabel}>Name:</span>
                              <span className={styles.metadataValue}>{source.metadata.name || 'Unknown'}</span>
                            </div>
                            <div className={styles.metadataGrid}>
                              <div className={styles.metadataItem}>
                                <span className={styles.metadataLabel}>Size:</span>
                                <span className={styles.metadataValue}>{source.metadata.size || 'Unknown'}</span>
                              </div>
                              <div className={styles.metadataItem}>
                                <span className={styles.metadataLabel}>Score:</span>
                                <span className={`${styles.metadataValue} ${styles.score}`}>{Math.round(source.score * 100)}%</span>
                              </div>
                            </div>
                            <div className={styles.metadataGrid}>
                              <div className={styles.metadataItem}>
                                <span className={styles.metadataLabel}>By:</span>
                                <span className={styles.metadataValue}>{source.metadata.author || 'Unknown'}</span>
                              </div>
                              <div className={styles.metadataItem}>
                                <span className={styles.metadataLabel}>Date:</span>
                                <span className={styles.metadataValue}>
                                  {source.metadata.date_created 
                                    ? new Date(source.metadata.date_created).toLocaleDateString()
                                    : 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 