
// APP 3.3 gate, shown immediately before EntryQuiz.
//
// Health information and information about religious or spiritual beliefs are
// "sensitive information" under s6(1) of the Privacy Act. An organisation may
// only collect them where the individual consents and the collection is
// reasonably necessary. OAIC treats valid consent as voluntary, informed,
// current, SPECIFIC, and given by someone with capacity.
//
// "Specific" is why this is a separate screen with its own record rather than
// a line inside the first-launch notice: a single blanket agreement covering
// all five domains would not be specific to the sensitive ones.
//
// Declining has to leave a working app. It skips two of five domains — it does
// not end the session.

import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { PrimaryButton } from "../components/ui";
import { colors, domainColors, radius, spacing, type } from "../theme";
import { SENSITIVE_CONSENT } from "./consentNotice";

// Tints each row with the domain accent already used on Home and the domain pages.
const ROW_ACCENT = {
    healthConsent: domainColors.health,
    spiritualityConsent: domainColors.spirituality,
};

export default function SensitiveConsentModal({ visible, onAnswer }) {
    const [choices, setChoices] = useState(() =>
        Object.fromEntries(SENSITIVE_CONSENT.items.map((i) => [i.key, false]))
    );

    const toggle = (key) => setChoices((prev) => ({ ...prev, [key]: !prev[key] }));

    const anySelected = Object.values(choices).some(Boolean);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
            <View style={styles.overlay} />

            <View
                style={styles.window}
                accessibilityViewIsModal
                accessibilityLabel={SENSITIVE_CONSENT.heading}
            >
                <Text style={styles.title}>{SENSITIVE_CONSENT.heading}</Text>

                <ScrollView
                    style={styles.body}
                    contentContainerStyle={styles.bodyContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.lede}>{SENSITIVE_CONSENT.body}</Text>

                    {SENSITIVE_CONSENT.items.map((item) => {
                        const accent = ROW_ACCENT[item.key] ?? colors.blPrimary;
                        const on = choices[item.key];
                        return (
                            <View
                                key={item.key}
                                style={[
                                    styles.row,
                                    {
                                        borderColor: on ? `${accent}55` : colors.border,
                                        backgroundColor: on ? `${accent}12` : "rgba(255,255,255,0.5)",
                                    },
                                ]}
                            >
                                <View style={styles.rowText}>
                                    <Text style={[styles.rowLabel, on && { color: accent }]}>{item.label}</Text>
                                    <Text style={styles.rowDescription}>{item.description}</Text>
                                </View>
                                <Switch
                                    value={on}
                                    onValueChange={() => toggle(item.key)}
                                    accessibilityLabel={item.label}
                                    trackColor={{ false: colors.blOutlineVariant, true: accent }}
                                    thumbColor={colors.card}
                                />
                            </View>
                        );
                    })}
                </ScrollView>

                <View style={styles.foot}>
                    <PrimaryButton
                        label={SENSITIVE_CONSENT.acceptLabel}
                        onPress={() =>
                            onAnswer({
                                health: choices.healthConsent,
                                spirituality: choices.spiritualityConsent,
                            })
                        }
                        disabled={!anySelected}
                    />

                    <Pressable
                        onPress={() => onAnswer({ health: false, spirituality: false })}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                    >
                        <Text style={styles.secondaryText}>{SENSITIVE_CONSENT.declineLabel}</Text>
                    </Pressable>
                </View>

                <Text style={styles.footnote}>
                    Whichever you choose, you can change it later in your profile.
                </Text>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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

    title: { ...type.h3, color: colors.text },

    body: { flexGrow: 0 },
    bodyContent: { gap: spacing.md, paddingBottom: spacing.sm },

    lede: { ...type.body, color: colors.textMuted },

    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
        padding: spacing.lg,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    rowText: { flex: 1, gap: 2 },
    rowLabel: { ...type.bodyMedium, fontFamily: type.label.fontFamily, color: colors.text },
    rowDescription: { ...type.small, fontSize: 12, color: colors.textMuted },

    foot: { gap: spacing.sm },
    secondary: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.blOutlineVariant,
        backgroundColor: "rgba(255,255,255,0.6)",
    },
    secondaryText: { ...type.title, fontSize: 16, color: colors.blOnSurface },

    footnote: { ...type.caption, fontSize: 11, color: colors.textMuted, textAlign: "center" },
});