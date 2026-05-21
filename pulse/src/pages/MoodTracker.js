import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    MOODS,
    JOURNAL_PROMPTS,
    todayKey,
    getTimeOfDay,
    buildWeekData,
} from "../data/spirituality";

// ---------------------------------------------------------------------------
// MoodFace — soft filled circle, dot eyes, curved mouth. No eyebrows.
// Always rendered filled with the mood colour; feature colour is white when
// selected (solid fill) or the mood colour when unselected (light fill).
// ---------------------------------------------------------------------------

// Mouth paths per mood id, drawn on a 48×48 viewBox centred at (24,24).
const MOUTHS = {
    1: "M 15 30 Q 24 24 33 30",   // frown
    2: "M 16 29 Q 24 26 32 29",   // slight frown
    3: "M 16 28 L 32 28",          // flat
    4: "M 15 27 Q 24 33 33 27",   // slight smile
    5: "M 14 26 Q 24 35 34 26",   // big smile
};

export function MoodFace({ moodId, size = 48, selected = false }) {
    const m = MOODS.find((x) => x.id === moodId) || MOODS[2];

    // Unselected: light bg fill + coloured border + coloured features.
    // Selected: solid colour fill + no border + white features.
    const circleFill   = selected ? m.color : m.bg;
    const circleStroke = selected ? "none"  : m.color;
    const featureColor = selected ? "rgba(255,255,255,0.92)" : m.color;

    // Eye and mouth sizes scale gently with the face size
    const eyeR  = size * 0.055;   // ~2.6 at size=48
    const eyeOX = size * 0.175;   // horizontal offset from centre
    const eyeOY = size * 0.08;    // vertical offset above centre (upward)
    const sw    = size * 0.055;   // stroke width

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            style={{ display: "block", flexShrink: 0 }}
        >
            {/* Face circle */}
            <circle
                cx="24" cy="24" r="22"
                fill={circleFill}
                stroke={circleStroke}
                strokeWidth="1.8"
            />

            {/* Eyes */}
            <circle cx={24 - 8.4} cy={24 - 3.8} r="2.6" fill={featureColor} />
            <circle cx={24 + 8.4} cy={24 - 3.8} r="2.6" fill={featureColor} />

            {/* Mouth */}
            <path
                d={MOUTHS[moodId] || MOUTHS[3]}
                stroke={featureColor}
                strokeWidth="2.6"
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// MoodCheckInOverlay — step 1: pick a mood
// ---------------------------------------------------------------------------

export function MoodCheckInOverlay({ onSelect, onSkip }) {
    const [selected, setSelected] = useState(null);
    const [leaving, setLeaving] = useState(false);

    const proceed = (moodId) => {
        setLeaving(true);
        setTimeout(() => onSelect(moodId), 320);
    };

    const skip = () => {
        setLeaving(true);
        setTimeout(() => onSkip(), 320);
    };

    const m = selected ? MOODS.find((x) => x.id === selected) : null;

    return (
        <div
            className="mood-shell"
            style={{
                opacity: leaving ? 0 : 1,
                transform: leaving ? "translateY(6px) scale(0.98)" : "none",
                transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
        >
            <div className="mood-container">
                <div className="mood-header">
                    <button type="button" className="mood-back" onClick={skip}>
                        ← Home
                    </button>
                    <div className="mood-title-block" style={{ flex: 1 }}>
                        <h1>Spirituality</h1>
                        <div className="mood-subtitle">Daily check-in</div>
                    </div>
                </div>

                <div className="mood-card" style={{ textAlign: "center", paddingTop: 32, paddingBottom: 32 }}>
                    <p style={{ fontSize: 11, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--pulse-text-muted)", marginBottom: 8 }}>
                        Good {getTimeOfDay()}! How are you feeling?
                    </p>
                    <h2 style={{ fontSize: 26, fontWeight: 600, margin: "0 0 28px", color: "var(--pulse-text)" }}>
                        {selected ? m.label : "Select a mood"}
                    </h2>

                    <div
                        style={{
                            width: 120, height: 120, borderRadius: "50%",
                            background: m ? m.bg : "var(--pulse-card-bg, #faf7f9)",
                            border: `2px solid ${m ? m.color + "55" : "var(--pulse-border)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 32px",
                            transition: "background 0.3s ease, border-color 0.3s ease",
                        }}
                    >
                        <MoodFace moodId={selected || 3} size={90} selected={!!selected} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 8 }}>
                        {MOODS.map((mood) => (
                            <button
                                key={mood.id}
                                type="button"
                                onClick={() => setSelected(mood.id)}
                                style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: 0,
                                    transform: selected === mood.id ? "scale(1.18)" : "scale(1)",
                                    transition: "transform 0.18s ease",
                                }}
                                aria-label={mood.label}
                                aria-pressed={selected === mood.id}
                            >
                                <MoodFace moodId={mood.id} size={44} selected={selected === mood.id} />
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: selected === mood.id ? 600 : 400,
                                    color: selected === mood.id ? mood.textColor : "var(--pulse-text-muted)",
                                    transition: "color 0.15s",
                                }}>
                  {mood.label}
                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!selected}
                    onClick={() => selected && proceed(selected)}
                    style={{
                        width: "100%",
                        background: selected ? m.color : undefined,
                        borderColor: selected ? m.color : undefined,
                        transition: "background 0.3s ease",
                    }}
                >
                    Continue →
                </button>
                <button type="button" className="btn btn-ghost" onClick={skip} style={{ width: "100%", marginTop: 8 }}>
                    Skip for now
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// JournalPromptOverlay — step 2: write a journal entry
// ---------------------------------------------------------------------------

export function JournalPromptOverlay({ moodId, onSave, onSkip }) {
    const [text, setText] = useState("");
    const [leaving, setLeaving] = useState(false);
    const textareaRef = useRef(null);
    const m = MOODS.find((x) => x.id === moodId);
    const prompt = JOURNAL_PROMPTS[new Date().getDay() % JOURNAL_PROMPTS.length];

    useEffect(() => {
        setTimeout(() => textareaRef.current?.focus(), 100);
    }, []);

    const save = () => {
        setLeaving(true);
        setTimeout(() => onSave(text.trim()), 320);
    };

    const skip = () => {
        setLeaving(true);
        setTimeout(() => onSkip(), 320);
    };

    return (
        <div
            className="mood-shell"
            style={{
                opacity: leaving ? 0 : 1,
                transform: leaving ? "translateY(6px)" : "none",
                transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
        >
            <div className="mood-container">
                <div className="mood-header">
                    <button type="button" className="mood-back" onClick={skip}>
                        ← Skip
                    </button>
                    <div className="mood-title-block" style={{ flex: 1 }}>
                        <h1>Journal</h1>
                    </div>
                </div>

                <div className="mood-card">
                    <div style={{
                        display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
                        padding: "10px 14px", background: m.bg, borderRadius: 12,
                        border: `1px solid ${m.color}33`,
                    }}>
                        <MoodFace moodId={moodId} size={32} selected />
                        <span style={{ fontSize: 14, color: m.textColor, fontWeight: 500 }}>
              Feeling {m.label.toLowerCase()} today
            </span>
                    </div>

                    <div style={{ borderLeft: `3px solid ${m.color}`, paddingLeft: 12, marginBottom: 16 }}>
                        <p style={{ margin: 0, fontSize: 15, fontStyle: "italic", color: "var(--pulse-text)", lineHeight: 1.5 }}>
                            "{prompt}"
                        </p>
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Write freely — this is just for you…"
                        rows={6}
                        style={{
                            width: "100%", boxSizing: "border-box", resize: "none",
                            border: "1px solid var(--pulse-border)", borderRadius: 10,
                            padding: "12px 14px", fontSize: 14, lineHeight: 1.6,
                            fontFamily: "inherit", color: "var(--pulse-text)",
                            background: "var(--pulse-input-bg, var(--pulse-bg))", outline: "none",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = m.color)}
                        onBlur={(e) => (e.target.style.borderColor = "var(--pulse-border)")}
                    />

                    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={save}
                            style={{
                                background: text.trim() ? m.color : undefined,
                                borderColor: text.trim() ? m.color : undefined,
                            }}
                        >
                            {text.trim() ? "Save & continue →" : "Continue without writing →"}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={skip}>
                            Skip
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// WeekMoodChart — SVG chart of the last 7 days
// ---------------------------------------------------------------------------

export function WeekMoodChart({ weekData }) {
    const entries = weekData.filter((d) => d.moodId != null);

    const W = 300, H = 90, PAD_X = 18, PAD_Y = 12;
    const colW = W / 7;
    const yScale = (id) => PAD_Y + ((5 - id) / 4) * (H - PAD_Y * 2);

    const points = weekData.map((d, i) =>
        d.moodId != null
            ? { x: colW * i + colW / 2, y: yScale(d.moodId), moodId: d.moodId, key: d.key }
            : null
    );

    const lineSegs = [];
    let seg = [];
    for (const p of points) {
        if (p) {
            seg.push(p);
        } else if (seg.length > 0) {
            lineSegs.push(seg);
            seg = [];
        }
    }
    if (seg.length > 0) lineSegs.push(seg);

    function cubicPath(pts) {
        if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
            const cp = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * 0.5;
            d += ` C ${cp} ${pts[i - 1].y}, ${cp} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
        }
        return d;
    }

    if (entries.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--pulse-text-muted)", fontSize: 13 }}>
                No mood data this week yet
            </div>
        );
    }

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H + 28}`} style={{ overflow: "visible", display: "block" }}>
            {[1, 2, 3, 4, 5].map((v) => (
                <line key={v} x1={PAD_X} x2={W - PAD_X} y1={yScale(v)} y2={yScale(v)}
                      stroke="var(--pulse-border)" strokeWidth="0.5" strokeDasharray="3 3" />
            ))}

            {lineSegs.map((seg, si) =>
                seg.length > 1 ? (
                    <path key={si} d={cubicPath(seg)} fill="none"
                          stroke="var(--pulse-border)" strokeWidth="2" strokeLinecap="round" />
                ) : null
            )}

            {points.map((p, i) => {
                if (!p) {
                    return (
                        <circle key={weekData[i].key} cx={colW * i + colW / 2} cy={H / 2}
                                r="5" fill="none" stroke="var(--pulse-border)" strokeWidth="1" />
                    );
                }
                const m = MOODS.find((x) => x.id === p.moodId);
                return (
                    <g key={p.key}>
                        <circle cx={p.x} cy={p.y} r="13" fill={m.bg} stroke={m.color} strokeWidth="1.5" />
                        <circle cx={p.x - 4} cy={p.y - 1} r="1.5" fill={m.color} />
                        <circle cx={p.x + 4} cy={p.y - 1} r="1.5" fill={m.color} />
                        {p.moodId >= 4 ? (
                            <path d={`M ${p.x - 4} ${p.y + 4} Q ${p.x} ${p.y + 7} ${p.x + 4} ${p.y + 4}`}
                                  stroke={m.color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        ) : p.moodId === 3 ? (
                            <line x1={p.x - 4} y1={p.y + 5} x2={p.x + 4} y2={p.y + 5}
                                  stroke={m.color} strokeWidth="1.5" strokeLinecap="round" />
                        ) : (
                            <path d={`M ${p.x - 4} ${p.y + 6} Q ${p.x} ${p.y + 3} ${p.x + 4} ${p.y + 6}`}
                                  stroke={m.color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        )}
                    </g>
                );
            })}

            {weekData.map((d, i) => (
                <text key={d.key} x={colW * i + colW / 2} y={H + 20} textAnchor="middle"
                      fontSize="10" fontWeight={d.isToday ? 700 : 400}
                      fill={d.isToday ? "var(--pulse-text)" : "var(--pulse-text-muted)"}>
                    {d.dayLabel}
                </text>
            ))}
        </svg>
    );
}

// ---------------------------------------------------------------------------
// MoodDashboard — main view
// ---------------------------------------------------------------------------

export function MoodDashboard({ uid, moodData, onLogNewMood, onBack }) {
    const weekData = useMemo(() => buildWeekData(moodData), [moodData]);
    const todayData = useMemo(() => moodData[todayKey()] || null, [moodData]);
    const todayMood = todayData ? MOODS.find((x) => x.id === todayData.moodId) : null;

    const dateStr = new Date().toLocaleDateString("en-AU", {
        weekday: "long", month: "long", day: "numeric",
    });

    const recentJournals = useMemo(() => {
        return Object.entries(moodData)
            .filter(([, v]) => v.journalText)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 4)
            .map(([k, v]) => {
                const d = new Date(k + "T12:00:00");
                return {
                    key: k,
                    dateLabel: d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }),
                    moodId: v.moodId,
                    text: v.journalText,
                };
            });
    }, [moodData]);

    return (
        <div className="mood-shell">
            <div className="mood-container">

                <div className="mood-header">
                    <button type="button" className="mood-back" onClick={onBack}>
                        ← Home
                    </button>
                    <div className="mood-title-block" style={{ flex: 1 }}>
                        <h1>Spirituality</h1>
                        <div className="mood-subtitle">{dateStr}</div>
                    </div>
                </div>

                {/* Today card */}
                <div
                    className="mood-card"
                    style={{
                        background: todayMood ? todayMood.bg : undefined,
                        border: todayMood ? `1px solid ${todayMood.color}33` : undefined,
                    }}
                >
                    <div className="section-title" style={{ color: todayMood ? todayMood.textColor : undefined }}>
                        Today's mood
                    </div>
                    {todayMood ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <MoodFace moodId={todayData.moodId} size={52} selected />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 18, color: todayMood.textColor }}>
                                        {todayMood.label}
                                    </div>
                                    {todayData.journalText && (
                                        <div style={{
                                            fontSize: 13, color: todayMood.textColor, opacity: 0.8,
                                            maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                        }}>
                                            {todayData.journalText}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ fontSize: 12, padding: "6px 12px", borderColor: todayMood.color + "55", color: todayMood.textColor }}
                                onClick={onLogNewMood}
                            >
                                Update
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: "var(--pulse-text-muted)" }}>
                No mood logged yet today
              </span>
                            <button type="button" className="btn btn-primary" style={{ fontSize: 13 }} onClick={onLogNewMood}>
                                Log mood →
                            </button>
                        </div>
                    )}
                </div>

                {/* Week chart */}
                <div className="mood-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>This week</div>
                        <span style={{ fontSize: 12, color: "var(--pulse-text-muted)" }}>
              {weekData.filter((d) => d.moodId != null).length}/7 days
            </span>
                    </div>
                    <WeekMoodChart weekData={weekData} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                        {MOODS.map((mood) => (
                            <div key={mood.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <MoodFace moodId={mood.id} size={28} />
                                <span style={{ fontSize: 10, color: "var(--pulse-text-muted)" }}>{mood.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Journal entries */}
                <div className="mood-card">
                    <div className="section-title">Journal</div>
                    {recentJournals.length === 0 ? (
                        <div className="empty-state">
                            No journal entries yet. Log a mood to start writing.
                        </div>
                    ) : (
                        <div className="tx-list">
                            {recentJournals.map((entry) => {
                                const m = entry.moodId ? MOODS.find((x) => x.id === entry.moodId) : null;
                                return (
                                    <div key={entry.key} className="tx-row" style={{ alignItems: "flex-start", paddingTop: 12, paddingBottom: 12 }}>
                                        <div className="tx-icon" style={{ background: m ? m.bg : "var(--pulse-card-bg)", flexShrink: 0 }}>
                                            {m ? <MoodFace moodId={m.id} size={28} selected /> : "📓"}
                                        </div>
                                        <div className="tx-main">
                                            <div className="tx-cat" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {m && (
                                                    <span style={{
                                                        fontSize: 11, fontWeight: 500, color: m.textColor,
                                                        background: m.bg, padding: "1px 7px", borderRadius: 20,
                                                        border: `1px solid ${m.color}33`,
                                                    }}>
                            {m.label}
                          </span>
                                                )}
                                                <span style={{ fontSize: 12, color: "var(--pulse-text-muted)" }}>
                          {entry.dateLabel}
                        </span>
                                            </div>
                                            <div className="tx-meta" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.45, whiteSpace: "normal" }}>
                                                {entry.text}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}