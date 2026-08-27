import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import SharingPromptPopUp from "./SharingPromptPopUp";
import { templatesFor } from "./shareTemplates";

/**
 * SHARE PROMPT STATE
 * ------------------
 *   <SharePromptProvider
 *     user={user}
 *     onPost={(post) => createAchievementPost({ ...post, authorUid: user.uid,
 *                                               authorName: displayNameFor(user) })}
 *     onOpenSocial={() => setView("social")}
 *   >
 *     {renderView()}
 *   </SharePromptProvider>
 *
 * Then in any domain page:
 *   const { openSharePrompt } = useSharePrompt();
 */

const SharePromptContext = createContext(null);

export const useSharePrompt = () => {
    const ctx = useContext(SharePromptContext);
    if (!ctx)
        throw new Error("useSharePrompt must be used inside <SharePromptProvider>");
    return ctx;
};

/** Achievements already prompted this session, so auto-prompts never nag twice. */
const seen = new Set();

const nameFor = (u) =>
    u?.displayName || u?.name || (u?.email ? u.email.split("@")[0] : null) || "you";

export function SharePromptProvider({
                                        children,
                                        user,
                                        onPost, // async (post) => { ok, data } | { ok:false, error }
                                        onDm,   // async ({ friend, reflection, imageUrl, ... }) => { ok, error? }
                                        onOpenSocial, // () => setView("social")
                                    }) {
    const [state, setState] = useState({
        open: false,
        domain: null,
        payload: null,
        source: "manual",
    });

    const openSharePrompt = useCallback(
        (domain, payload, opts = {}) => {
            // Signed out, or nothing worth sharing → don't interrupt.
            if (!user?.uid) return false;
            if (templatesFor(domain, payload).length === 0) return false;
            setState({ open: true, domain, payload, source: opts.source ?? "manual" });
            return true;
        },
        [user?.uid]
    );

    const closeSharePrompt = useCallback(
        () => setState((s) => ({ ...s, open: false })),
        []
    );

    const value = useMemo(
        () => ({ openSharePrompt, closeSharePrompt, isOpen: state.open }),
        [openSharePrompt, closeSharePrompt, state.open]
    );

    return (
        <SharePromptContext.Provider value={value}>
            {children}
            {state.open && (
                <SharingPromptPopUp
                    domain={state.domain}
                    payload={state.payload}
                    source={state.source}
                    username={nameFor(user)}
                    user={user}
                    onClose={closeSharePrompt}
                    onPost={onPost}
                    onDm={onDm}
                    onPosted={onOpenSocial}
                />
            )}
        </SharePromptContext.Provider>
    );
}

/**
 * AUTOMATIC PROMPT
 * ----------------
 * Two-part gate: an action fired AND its requirement is met. Pass both as one
 * boolean; the prompt opens on the transition to true.
 *
 *   journal   savedEntry && Boolean(journalText || emotions.length)
 *   fitness   workoutAdded && exercises.length > 0
 *   todo      tasks.length > 0 && tasks.every(t => t.done)
 *   finance   depositSaved && goal.currentAmount >= goal.targetAmount
 *
 * `key` identifies the achievement, not the screen, so returning to a page
 * doesn't re-prompt:
 *   journal → entry date key   fitness → workout.id
 *   todo    → `todo-${today}`  finance → `goal-${goal.id}`
 */
export function useAutoSharePrompt({
                                       when,
                                       domain,
                                       payload,
                                       key,
                                       enabled = true,
                                   }) {
    const { openSharePrompt } = useSharePrompt();
    const fired = useRef(false);

    useEffect(() => {
        if (!enabled || !when || fired.current) return;
        const dedupeKey = key ? `${domain}:${key}` : null;
        if (dedupeKey && seen.has(dedupeKey)) return;

        if (openSharePrompt(domain, payload, { source: "auto" })) {
            fired.current = true;
            if (dedupeKey) seen.add(dedupeKey);
        }
    }, [enabled, when, domain, payload, key, openSharePrompt]);
}

/** Call on logout so the next account starts clean. */
export const resetSharePromptHistory = () => seen.clear();