import React, { useState } from "react";
import { DOMAINS } from "../data/quizData";
import "./auth.css";


const SCALE = [
    { value: 1, label: "Poor" },
    { value: 2, label: "Struggling" },
    { value: 3, label: "Could be better" },
    { value: 4, label: "Good" },
    { value: 5, label: "Great" },
];

function getScaleColor(val) {
    if (!val) return "var(--pulse-border)";
    if (val === 1) return "#d64545";
    if (val === 2) return "#e08a3c";
    if (val === 3) return "#e0c23c";
    if (val === 4) return "#5aac6e";
    return "#2f9e7a";
}

function getScaleLabel(val) {
    return SCALE.find((s) => s.value === val)?.label ?? "";
}

function EntryQuiz({ onComplete }) {
    const [answers, setAnswers] = useState(
        Object.fromEntries(DOMAINS.map((d) => [d.id, null]))
    );

    const isComplete = DOMAINS.every((d) => answers[d.id] !== null);
    const answeredCount = DOMAINS.filter((d) => answers[d.id] !== null).length;

    function handleSlider(id, val) {
        setAnswers((prev) => ({ ...prev, [id]: val }));
    }

    function handleSubmit() {
        if (!isComplete || !onComplete) return;
        onComplete(DOMAINS.map((d) => ({ domain: d.id, score: answers[d.id] })));
    }

    return (
        <div className="auth-card" style={{ maxWidth: 520, width: "100%" }}>
            <div className="pulse-brand">
                <div className="pulse-logo">
                    <span className="pulse-logo-dot" aria-hidden="true" />
                    Pulse
                </div>
                <p className="pulse-tagline">How are you doing today?</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {DOMAINS.map((d, i) => {
                    const val = answers[d.id];
                    const color = getScaleColor(val);
                    const pct = val ? ((val - 1) / 4) * 100 : 0;
                    const isLast = i === DOMAINS.length - 1;

                    return (
                        <div
                            key={d.id}
                            style={{
                                padding: `18px 0 ${isLast ? "4px" : "18px"}`,
                                borderBottom: isLast ? "none" : "1px solid var(--pulse-border)",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    marginBottom: 10,
                                }}
                            >
                                <div>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--pulse-text)" }}>
                                        {d.icon ?? ""} {d.name}
                                    </p>
                                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--pulse-text-muted)" }}>
                                        {d.focus}
                                    </p>
                                </div>
                                <span
                                    style={{
                                        flexShrink: 0,
                                        marginLeft: 12,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        minWidth: 100,
                                        textAlign: "center",
                                        padding: "4px 10px",
                                        borderRadius: 20,
                                        background: val ? `${color}22` : "var(--pulse-bg)",
                                        color: val ? color : "var(--pulse-text-muted)",
                                        border: `1px solid ${val ? `${color}55` : "var(--pulse-border)"}`,
                                        transition: "all .2s ease",
                                    }}
                                >
                  {val ? `${val} — ${getScaleLabel(val)}` : "Not set"}
                </span>
                            </div>

                            <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "var(--pulse-text)", lineHeight: 1.45 }}>
                                {d.questions[0]}
                            </p>

                            <input
                                type="range"
                                min="1"
                                max="5"
                                step="1"
                                value={val ?? ""}
                                onChange={(e) => handleSlider(d.id, parseInt(e.target.value, 10))}
                                style={{
                                    width: "100%",
                                    height: 6,
                                    appearance: "none",
                                    WebkitAppearance: "none",
                                    background: val
                                        ? `linear-gradient(to right, ${color} ${pct}%, var(--pulse-border) ${pct}%)`
                                        : "var(--pulse-border)",
                                    borderRadius: 3,
                                    outline: "none",
                                    cursor: "pointer",
                                }}
                            />

                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                                {SCALE.map((s) => (
                                    <span
                                        key={s.value}
                                        style={{
                                            fontSize: 10,
                                            color: val === s.value ? color : "var(--pulse-text-muted)",
                                            fontWeight: val === s.value ? 700 : 400,
                                            transition: "all .15s",
                                        }}
                                    >
                    {s.label}
                  </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                type="button"
                className="btn btn-primary"
                disabled={!isComplete}
                onClick={handleSubmit}
            >
                {isComplete
                    ? "Submit check-in"
                    : `Answer all questions to continue (${answeredCount}/${DOMAINS.length})`}
            </button>
        </div>
    );
}
export default EntryQuiz;