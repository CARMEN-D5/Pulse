import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { templatesFor, serialisePayload } from "./shareTemplates";
import TemplateCarousel from "./TemplateCarousel";
import SharePostEditor from "./SharePostEditor";
import Icon from "../Icon";
import { PrimaryButton } from "../ui";
import { colors, radius, spacing, type } from "../../theme";

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

    // The web build bound Escape and locked body scroll. On native, <Modal>
    // already traps interaction, and onRequestClose covers the Android back
    // button — the equivalent of the Escape key here.
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
        <Modal
            visible
            transparent
            animationType="slide"
            onRequestClose={() => !posting && onClose()}
        >
            <Pressable
                style={styles.overlay}
                onPress={() => !posting && onClose()}
                accessibilityLabel="Close"
            />

            <View style={styles.window} accessibilityViewIsModal accessibilityLabel="Share to feed">
                <View style={styles.head}>
                    {step === "edit" ? (
                        <Pressable
                            onPress={() => setStep("select")}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Back to templates"
                            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                        >
                            <Text style={styles.iconText}>‹</Text>
                        </Pressable>
                    ) : (
                        <View style={styles.iconBtnGhost} />
                    )}

                    <Text style={styles.title}>Share</Text>

                    <Pressable
                        onPress={onClose}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                    >
                        <Icon name="close" size={20} color={colors.text} />
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.body}
                    contentContainerStyle={styles.bodyContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {step === "select" ? (
                        <TemplateCarousel
                            templates={templates}
                            index={index}
                            onIndexChange={setIndex}
                            payload={payload}
                            username={username}
                        />
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
                </ScrollView>

                {step === "select" && (
                    <View style={styles.foot}>
                        <PrimaryButton
                            label="Not now"
                            variant="danger"
                            onPress={onClose}
                            style={styles.flex}
                        />
                        <PrimaryButton
                            label="Post →"
                            onPress={() => setStep("edit")}
                            style={styles.flex}
                        />
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    pressed: { opacity: 0.7 },

    overlay: { flex: 1, backgroundColor: colors.overlay },
    window: {
        maxHeight: "85%",
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
        gap: spacing.md,
    },

    head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { ...type.h3, color: colors.text },
    iconBtn: { padding: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.rowTint },
    iconBtnGhost: { width: 28, height: 28 },
    iconText: { ...type.h3, color: colors.text },

    body: { flexGrow: 0 },
    bodyContent: { gap: spacing.md },
    foot: { flexDirection: "row", gap: spacing.sm },
});

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
