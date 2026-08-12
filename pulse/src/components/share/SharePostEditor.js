import React, { useState } from "react";

const REFLECTION_MAX = 280;

/*
 * editing window before post is submitted
 * reflection is-prefilled from the template but can be edited
 */
export default function SharePostEditor({
                                            template,
                                            payload,
                                            username,
                                            posting,
                                            error,
                                            onSubmit,
                                            onCancel,
                                        }) {
    const [reflection, setReflection] = useState(
        () => template.title?.(payload) ?? ""
    );

    const canPost = reflection.trim().length > 0 && !posting;

    return (
        <form
            className="sp-editor"
            onSubmit={(e) => {
                e.preventDefault();
                if (canPost) onSubmit({ reflection: reflection.trim() });
            }}
        >
            <div className="sp-editor__preview">
                {template.render(payload, { username })}
            </div>

            <label className="sp-field">
        <span className="sp-field__label">
          What I did to improve
          <span className="sp-field__count">
            {reflection.length}/{REFLECTION_MAX}
          </span>
        </span>
                <textarea
                    className="sp-input sp-input--area"
                    value={reflection}
                    maxLength={REFLECTION_MAX}
                    rows={3}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Say something about it…"
                />
            </label>

            {error && (
                <div className="alert alert-error" role="alert">
                    {error}
                </div>
            )}

            <div className="sp-window__foot">
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onCancel}
                    disabled={posting}
                >
                    Not now
                </button>
                <button className="btn btn-primary" type="submit" disabled={!canPost}>
                    {posting ? "Posting…" : "Share to feed"}
                </button>
            </div>
        </form>
    );
}