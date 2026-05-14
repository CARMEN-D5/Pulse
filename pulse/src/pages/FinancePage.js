import React from 'react';
import DomainPage from './DomainPage';

// Finance-specific features go here as the app scales.
// e.g. category budgets, bill reminders, net-worth view, savings goals, cash-flow insights.

function FinancePage(props) {
  return <DomainPage domainKey="finance" {...props} />;
}

export default FinancePage;
