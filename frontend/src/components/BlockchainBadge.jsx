import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AppContext } from '../context/AppContext';

export default function BlockchainBadge({ predictionId, blockchain }) {
  const { token, backendUrl } = useContext(AppContext);
  const [status, setStatus] = useState('pending');
  const [data,   setData]   = useState(null);

  // Use a ref to track verified — avoids stale closure in interval
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!predictionId) return;

    const poll = async () => {
      // Stop polling once verified
      if (verifiedRef.current) return;

      setStatus('checking');
      try {
        const { data: res } = await axios.get(
          `${backendUrl}/api/predictions/verify/${predictionId}`,
          { headers: { token } }
        );

        if (res.verified) {
          verifiedRef.current = true;
          setStatus('verified');
          setData(res);
        } else {
          setStatus('pending');
        }
      } catch {
        setStatus('failed');
      }
    };

    // First poll after 20s, then every 15s until verified
    const t1 = setTimeout(poll, 20000);
    const t2 = setInterval(() => {
      if (verifiedRef.current) {
        clearInterval(t2);
        return;
      }
      poll();
    }, 15000);

    return () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
  }, [predictionId]); // ← only predictionId, not status

  if (!blockchain) return null;

  const isVerified = status === 'verified';
  const isFailed   = status === 'failed';
  const isChecking = status === 'checking';

  const wrap = {
    marginTop: '16px', padding: '14px 18px', borderRadius: '12px',
    border: isVerified ? '1.5px solid #bfdbfe' : isFailed ? '1.5px solid #fecaca' : '1.5px solid #e2e8f0',
    background: isVerified ? '#eff6ff' : isFailed ? '#fef2f2' : '#f8fafc',
    display: 'flex', alignItems: 'center', gap: '12px',
    fontFamily: 'system-ui, sans-serif',
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={wrap}>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isVerified ? '#2563eb' : isFailed ? '#ef4444' : '#94a3b8',
        }}>
          {isChecking ? (
            <div style={{ width:14, height:14, border:'2px solid #e2e8f0',
              borderTop:'2px solid #2563eb', borderRadius:'50%',
              animation:'spin 0.8s linear infinite' }} />
          ) : isVerified ? (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          ) : isFailed ? (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          ) : (
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          )}
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize:'13px', fontWeight:700, margin:'0 0 2px',
            color: isVerified ? '#1e3a8a' : isFailed ? '#dc2626' : '#475569' }}>
            {isVerified  && '⛓️ Blockchain Verified'}
            {!isVerified && !isFailed && (isChecking ? 'Checking blockchain…' : 'Storing on Blockchain…')}
            {isFailed    && 'Blockchain unavailable'}
          </p>
          {isVerified && data ? (
            <p style={{ fontSize:'11.5px', color:'#64748b', margin:0 }}>
              Confirmed on Sepolia ·{' '}
              <a href={data.etherscanUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:'11.5px', color:'#2563eb', textDecoration:'none', fontWeight:600 }}>
                View on Etherscan →
              </a>
            </p>
          ) : isFailed ? (
            <p style={{ fontSize:'11.5px', color:'#64748b', margin:0 }}>Result saved — blockchain temporarily unavailable</p>
          ) : (
            <p style={{ fontSize:'11.5px', color:'#64748b', margin:0 }}>Usually confirms in ~20 seconds</p>
          )}
        </div>

        {/* Hash pill */}
        {blockchain.hash && (
          <div style={{ fontFamily:'monospace', fontSize:'10px', color:'#94a3b8',
            background:'#f1f5f9', padding:'4px 8px', borderRadius:'6px',
            maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis',
            whiteSpace:'nowrap', flexShrink:0 }}>
            {blockchain.hash.slice(0, 10)}…
          </div>
        )}
      </div>
    </>
  );
}
