import React from 'react';
import DomainPage from './DomainPage';

// Health-specific features go here as the app scales.
// e.g. nutrition tracking, hydration, recovery scoring, wearable integration.

function HealthPage(props) {
  return <DomainPage domainKey="health" {...props} />;
}

export default HealthPage;
