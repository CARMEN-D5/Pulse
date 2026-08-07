import React, { useState } from "react";

const money = (value) => `$${Number(value || 0).toLocaleString("en-AU", { maximumFractionDigits: 2 })}`;

function milestoneCopy(event) {
  if (event.milestone === 25) return { emoji: "🌱", lead: "Great start!", tail: "Keep it going!" };
  if (event.milestone === 50) return { emoji: "🎉", lead: "Amazing work!", tail: event.actualProgress > 50 ? "You're past the halfway mark!" : "You're halfway there!" };
  if (event.milestone === 75) return { emoji: "💪", lead: "Your consistency is paying off!", tail: "Keep going — you're getting really close." };
  return { emoji: "🚀", lead: "So close!", tail: "You're almost there!" };
}

export default function SavingMilestoneModal({ event, onClose, onComplete }) {
  const [completing, setCompleting] = useState(false);
  if (!event) return null;
  if (event.type === "completed") {
    return <div className="modal-backdrop"><div className="modal-card saving-modal saving-milestone-modal" role="dialog" aria-modal="true" aria-labelledby="saving-completed-title">
      <div className="saving-milestone-emoji" aria-hidden="true">🎉</div>
      <h3 id="saving-completed-title">Goal completed!</h3>
      <strong className="saving-milestone-lead">Congratulations!</strong>
      <p>You've successfully reached your saving goal for <strong>{event.planName}</strong>.</p>
      <p>You saved <strong>{money(event.savedAmount)}</strong> toward your goal of <strong>{money(event.targetAmount)}</strong>.</p>
      <p>Amazing work — enjoy the achievement!</p>
      <button type="button" className="btn btn-primary" disabled={completing} onClick={async () => { setCompleting(true); const completed = await onComplete(event); if (!completed) setCompleting(false); }}>{completing ? "Completing…" : "Awesome!"}</button>
    </div></div>;
  }

  const copy = milestoneCopy(event);
  return <div className="modal-backdrop" onMouseDown={(mouseEvent) => mouseEvent.target === mouseEvent.currentTarget && onClose()}><div className="modal-card saving-modal saving-milestone-modal" role="dialog" aria-modal="true" aria-labelledby="saving-milestone-title">
    <div className="saving-milestone-emoji" aria-hidden="true">{copy.emoji}</div>
    <h3 id="saving-milestone-title">You're making progress!</h3>
    <strong className="saving-milestone-lead">{copy.lead}</strong>
    <p>You're now <strong>{event.actualProgress}%</strong> of the way to <strong>{event.planName}</strong>.</p>
    <p>{copy.tail}</p>
    <button type="button" className="btn btn-primary" onClick={onClose}>Continue</button>
  </div></div>;
}
