import React from 'react';
import DomainPage from './DomainPage';

// Productivity-specific features go here as the app scales.
// e.g. priority planning, project breakdowns, time-blocking, distraction tracking.

function ProductivityPage(props) {
  return <DomainPage domainKey="productivity" {...props} />;
}

export default ProductivityPage;
