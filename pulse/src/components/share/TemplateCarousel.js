import React, { useEffect, useRef } from "react";

/*
 * template carousel of different templates
 * scroll/swipe/arrow/dot actions when there is more than one template avaialble
 * one template will be stationary
 */
export default function TemplateCarousel({
                                             templates,
                                             index,
                                             onIndexChange,
                                             payload,
                                             username,
                                         }) {
    const trackRef = useRef(null);
    const single = templates.length === 1;

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const child = track.children[index];
        if (!child) return;
        const left = child.offsetLeft - track.offsetLeft;
        if (typeof track.scrollTo === "function") {
            track.scrollTo({ left, behavior: "smooth" });
        } else {
            track.scrollLeft = left;
        }
    }, [index]);

    const handleScroll = () => {
        const track = trackRef.current;
        if (!track) return;
        const mid = track.scrollLeft + track.clientWidth / 2;
        let nearest = 0;
        let best = Infinity;
        Array.from(track.children).forEach((c, i) => {
            const centre = c.offsetLeft - track.offsetLeft + c.clientWidth / 2;
            const d = Math.abs(centre - mid);
            if (d < best) {
                best = d;
                nearest = i;
            }
        });
        if (nearest !== index) onIndexChange(nearest);
    };

    const step = (delta) => {
        const next = Math.min(templates.length - 1, Math.max(0, index + delta));
        onIndexChange(next);
    };

    return (
        <div className="sp-carousel">
            {!single && (
                <button
                    className="sp-nav sp-nav--prev"
                    onClick={() => step(-1)}
                    disabled={index === 0}
                    aria-label="Previous template"
                >
                    ‹
                </button>
            )}

            <div
                className="sp-carousel__track"
                ref={trackRef}
                onScroll={handleScroll}
                tabIndex={0}
                role="listbox"
                aria-label="Share templates"
                onKeyDown={(e) => {
                    if (e.key === "ArrowRight") step(1);
                    if (e.key === "ArrowLeft") step(-1);
                }}
            >
                {templates.map((t, i) => (
                    <div
                        key={t.id}
                        className={`sp-slide ${i === index ? "is-active" : ""}`}
                        role="option"
                        aria-selected={i === index}
                        onClick={() => onIndexChange(i)}
                    >
                        {t.render(payload, { username })}
                    </div>
                ))}
            </div>

            {!single && (
                <button
                    className="sp-nav sp-nav--next"
                    onClick={() => step(1)}
                    disabled={index === templates.length - 1}
                    aria-label="Next template"
                >
                    ›
                </button>
            )}

            <div className="sp-carousel__meta">
                <span className="sp-carousel__label">{templates[index]?.label}</span>
                {!single && (
                    <div className="sp-dots">
                        {templates.map((t, i) => (
                            <button
                                key={t.id}
                                className={`sp-dot ${i === index ? "is-active" : ""}`}
                                onClick={() => onIndexChange(i)}
                                aria-label={`Template ${i + 1}: ${t.label}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}