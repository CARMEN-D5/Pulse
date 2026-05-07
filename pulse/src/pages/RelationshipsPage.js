import React from 'react';
import DomainPage from './DomainPage';

// Relationships-specific features go here as the app scales.
// e.g. contact frequency graphs, social planning, connection quality ratings, shared goals.

function RelationshipsPage(props) {
  return <DomainPage domainKey="relationships" {...props} />;
}

export default RelationshipsPage;
