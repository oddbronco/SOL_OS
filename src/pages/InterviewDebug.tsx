import React from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';

export const InterviewDebug: React.FC = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const debugInfo = {
    'Window Location': {
      href: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      hostname: window.location.hostname
    },
    'React Router Location': {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state
    },
    'useParams': params,
    'Search Params': Object.fromEntries(searchParams.entries())
  };

  console.log('INTERVIEW DEBUG INFO:', debugInfo);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1 style={{ color: '#333' }}>Interview Page Debug</h1>
      <pre style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', overflow: 'auto' }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
};
