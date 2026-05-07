import React from 'react';
import DomainPage from './DomainPage';

// Spirituality-specific features go here as the app scales.
// e.g. gratitude streaks, guided reflections, purpose goals, sentiment analysis.

function SpiritualityPage(props) {
  return <DomainPage domainKey="spirituality" {...props} />;
}

export default SpiritualityPage;
