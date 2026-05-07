import React, { useState } from 'react';
import { DOMAINS, DOMAIN_KEYS } from '../scoring/scoringEngine';
import './auth.css';

const RATING_LABELS = ['', 'Poor', 'Fair', 'Okay', 'Good', 'Great'];

function RatingPicker({ value, onChange }) {
  return (
    <div className="rating-picker">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`rating-btn${value === n ? ' rating-btn--active' : ''}`}
          onClick={() => onChange(n)}
          aria-label={`${n} – ${RATING_LABELS[n]}`}
        >
          <span className="rating-num">{n}</span>
          <span className="rating-label">{RATING_LABELS[n]}</span>
        </button>
      ))}
    </div>
  );
}

function Onboarding({ onComplete, loading }) {
  const [ratings, setRatings] = useState(
    Object.fromEntries(DOMAIN_KEYS.map(k => [k, 0]))
  );

  const allRated = DOMAIN_KEYS.every(k => ratings[k] > 0);

  function setRating(domain, value) {
    setRatings(prev => ({ ...prev, [domain]: value }));
  }

  return (
    <div className="auth-shell">
      <div className="onboarding-card">
        <div className="pulse-brand">
          <div className="pulse-logo">
            <span className="pulse-logo-dot" aria-hidden="true" />
            Pulse
          </div>
          <p className="pulse-tagline">Let's set up your balance baseline</p>
        </div>

        <p className="onboarding-intro">
          Rate each area of your life right now. This gives you a starting score
          while the app learns your patterns.
        </p>

        <div className="onboarding-domains">
          {DOMAIN_KEYS.map(key => {
            const domain = DOMAINS[key];
            return (
              <div key={key} className="onboarding-domain">
                <div className="onboarding-domain-header">
                  <span className="onboarding-domain-icon" aria-hidden="true">
                    {domain.icon}
                  </span>
                  <div>
                    <p className="onboarding-domain-name">{domain.label}</p>
                    <p className="onboarding-domain-prompt">{domain.onboardingPrompt}</p>
                  </div>
                </div>
                <RatingPicker
                  value={ratings[key]}
                  onChange={v => setRating(key, v)}
                />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="btn btn-primary"
          disabled={!allRated || loading}
          onClick={() => onComplete(ratings)}
        >
          {loading ? 'Saving…' : 'See my balance score →'}
        </button>

        {!allRated && (
          <p className="onboarding-hint">Rate all 5 domains to continue.</p>
        )}
      </div>
    </div>
  );
}

export default Onboarding;
