import React, { useEffect, useMemo, useState } from "react";
import { templatesFor, serialisePayload } from "./shareTemplates";
import TemplateCarousel from "./TemplateCarousel";
import SharePostEditor from "./SharePostEditor";
import "./share.css";

export default function SharingPromptPopUp({
                                               domain,
                                               payload,
                                               source = "manual",
                                               username,
                                               onClose,
                                               onPost,
                                               onPosted,
                                           }) {
    const templates = useMemo(
        () => templatesFor(domain, payload),
        [domain, payload]
    );

    const [step, setStep] = useState("select");
    const [index, setIndex] = useState(0);
    const [posting, setPosting] = useState(false);
    const [error, setError] = useState(null);

    const selected = templates[index];

    // esc key closes. body scroll locks while open
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && !posting && onClose();
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose, posting]);

    if (!selected) return null;

    const handlePost = async ({ reflection }) => {
        setPosting(true);
        setError(null);
        try {
            const res = await onPost?.({
                domain,
                templateId: selected.id,
                payload: serialisePayload(domain, payload),
                reflection,
                source,
            });
            // firestore/social.js returns { ok, data } / { ok:false, error }
            if (res && res.ok === false) {
                setError(res.error || "Couldn't share that. Try again.");
                setPosting(false);
                return;
            }
            onClose();
            onPosted?.();
        } catch (e) {
            setError(e?.message ?? "Couldn't share that. Try again.");
            setPosting(false);
        }
    };

    return (
        <div
            className="sp-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Share to feed"
            onMouseDown={(e) => e.target === e.currentTarget && !posting && onClose()}
        >
            <div className="sp-window">
                <header className="sp-window__head">
                    {step === "edit" ? (
                        <button
                            className="sp-icon-btn"
                            onClick={() => setStep("select")}
                            aria-label="Back to templates"
                        >
                            ‹
                        </button>
                    ) : (
                        <span className="sp-icon-btn sp-icon-btn--ghost" aria-hidden />
                    )}
                    <h2 className="sp-window__title">Share</h2>
                    <button className="sp-icon-btn" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </header>

                {step === "select" ? (
                    <>
                        <TemplateCarousel
                            templates={templates}
                            index={index}
                            onIndexChange={setIndex}
                            payload={payload}
                            username={username}
                        />
                        <div className="sp-window__foot">
                            <button type="button" className="btn btn-ghost" onClick={onClose}>
                                Not now
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setStep("edit")}
                            >
                                Post →
                            </button>
                        </div>
                    </>
                ) : (
                    <SharePostEditor
                        template={selected}
                        payload={payload}
                        username={username}
                        posting={posting}
                        error={error}
                        onSubmit={handlePost}
                        onCancel={onClose}
                    />
                )}
            </div>
        </div>
    );
}
/*
logic for share prompt in each domain

mood tracker

1. automatic prompt option
if saveAndContinueButtonIsClicked = true
progressSharePrompt window >
    window box:
    title "share"
    share prompt template carousel selection
    button: post

    if promptTemplate[number] is true && buttonIsClicked is true
    promptTemplate = new selectedTemplate

    if buttonIsClicked >
       taken to social feed / in post editing window >
       input: title (pre-filled/can be edited)
       input: comment (optional)
       selectedTemplate
       post

2. manual share prompt option
sharePrompt button in top right corner
if buttonIsClicked = true
progressSharePrompt window >
" " - from first option

fitness tracker
1. automatic prompt option
if addButtonIsClicked = true
progressSharePrompt window >
    window box:
    title "share"
    share prompt template carousel selection
    button: post

    if promptTemplate[number] is true && buttonIsClicked is true
    promptTemplate = new selectedTemplate

    if buttonIsClicked >
       taken to social feed / in post editing window >
       input: title (pre-filled/can be edited)
       input: comment (optional)
       selectedTemplate
       post

2. manual share prompt option
sharePrompt button in top right corner
if buttonIsClicked = true
progressSharePrompt window >
" " - from first option

todo
1. automatic prompt option
if all tasks completed for today / last outstanding check box ticked
progressSharePrompt window >
    window box:
    title "share"
    "i completed all my tasks for the day!"
    button: post

    if buttonIsClicked >
       taken to social feed / in post editing window >
       input: title (pre-filled/can be edited)
       input: comment (optional)
       selectedTemplate
       post

2. manual share prompt option
sharePrompt button in top right corner
if buttonIsClicked = true
progressSharePrompt window >
" " - from first option
 */