import React from "react";
import { useSharePrompt } from "./SharePromptProvider";
import { templatesFor } from "./shareTemplates";

/**
 * manual share option/trigger
 * set in the top right corner of a domain
 *
 *   <ShareButton domain="finance" payload={goal} />
 *
 * hides itself when there's nothing shareable yet, so the user never taps
 * into an empty prompt.
 */
export default function ShareButton({ domain, payload, className = "" }) {
    const { openSharePrompt } = useSharePrompt();
    const available = templatesFor(domain, payload).length > 0;
    if (!available) return null;

    return (
        <button
            className={`sp-share-btn ${className}`}
            onClick={() => openSharePrompt(domain, payload, { source: "manual" })}
            aria-label="Share to feed"
            title="Share to feed"
        >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path
                    d="M12 16V4m0 0L8 8m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </button>
    );
}