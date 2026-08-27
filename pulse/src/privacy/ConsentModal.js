
// First-launch collection notice (APP 5, Privacy Act 1988 (Cth)).
// Shown over Splash, before any personal information is collected.
//
// Follows the SharingPromptPopUp idiom — transparent <Modal>, overlay Pressable,
// bottom sheet on colors.card — with two deliberate differences:
//
//   1. Tapping the overlay does NOT dismiss. A dismissal that leaves no record
//      would have to be treated as neither consent nor refusal, and the modal
//      would just come back. A visible choice is kinder than a silent loop.
//   2. "Not now" is not PrimaryButton variant="danger". Painting refusal red
//      while acceptance is calm teal is a dark pattern, and consent obtained
//      that way is not "voluntary" in the OAIC sense. It gets neutral,
//      equal-weight styling instead.

import React, { useState } from "react";
import {
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";

import { PrimaryButton } from "../components/ui";
import { colors, radius, spacing, type } from "../theme";
import {
    NOTICE_SECTIONS,
    OPTIONAL_CONSENTS,
    PRIVACY_POLICY_URL,
    SHORT_NOTICE,
} from "./consentNotice";

export default function ConsentModal({ visible, onAccept, onDecline }) {
    const [expanded, setExpanded] = useState(false);
    const [optional, setOptional] = useState(() =>
        Object.fromEntries(OPTIONAL_CONSENTS.map((o) => [o.key, false]))
    );

    const toggle = (key) => setOptional((prev) => ({ ...prev, [key]: !prev[key] }));

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            // Android back must not count as an answer either way.
            onRequestClose={() => {}}
        >
            <View style={styles.overlay} />

            <View
                style={styles.window}
                accessibilityViewIsModal
                accessibilityLabel="Your privacy on Pulse"
            >
                <View style={styles.head}>
                    <View style={styles.logoRow}>
                        <View style={styles.logoDot} />
                        <Text style={styles.logo}>Pulse</Text>
                    </View>
                    <Text style={styles.title}>Your privacy</Text>
                </View>

                <ScrollView
                    style={styles.body}
                    contentContainerStyle={styles.bodyContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.lede}>{SHORT_NOTICE}</Text>

                    <Pressable
                        onPress={() => setExpanded((e) => !e)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded }}
                        style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}
                    >
                        <Text style={styles.disclosureText}>
                            {expanded ? "Hide the details" : "Read the full details"}
                        </Text>
                        <Text style={styles.disclosureChevron}>{expanded ? "–" : "+"}</Text>
                    </Pressable>

                    {expanded
                        ? NOTICE_SECTIONS.map((section) => (
                            <View key={section.id} style={styles.section}>
                                <Text style={styles.sectionHeading}>{section.heading}</Text>
                                <Text style={styles.sectionBody}>{section.body}</Text>
                            </View>
                        ))
                        : null}

                    {OPTIONAL_CONSENTS.length ? (
                        <View style={styles.optional}>
                            <Text style={styles.optionalHeading}>Optional — your choice</Text>

                            {OPTIONAL_CONSENTS.map((o) => (
                                <View key={o.key} style={styles.optionRow}>
                                    <View style={styles.optionText}>
                                        <Text style={styles.optionLabel}>{o.label}</Text>
                                        <Text style={styles.optionDescription}>{o.description}</Text>
                                    </View>
                                    <Switch
                                        value={optional[o.key]}
                                        onValueChange={() => toggle(o.key)}
                                        accessibilityLabel={o.label}
                                        trackColor={{ false: colors.blOutlineVariant, true: colors.blPrimary }}
                                        thumbColor={colors.card}
                                    />
                                </View>
                            ))}
                        </View>
                    ) : null}

                    <Pressable
                        onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
                        accessibilityRole="link"
                        style={({ pressed }) => pressed && styles.pressed}
                    >
                        <Text style={styles.link}>Read our full privacy policy</Text>
                    </Pressable>
                </ScrollView>

                <View style={styles.foot}>
                    <PrimaryButton label="I understand — continue" onPress={() => onAccept(optional)} />

                    <Pressable
                        onPress={onDecline}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                    >
                        <Text style={styles.secondaryText}>Not now</Text>
                    </Pressable>
                </View>

                <Text style={styles.footnote}>
                    You can change these choices, or delete your account and everything in it, at any time in
                    your profile.
                </Text>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    pressed: { opacity: 0.7 },

    overlay: { flex: 1, backgroundColor: colors.overlay },
    window: {
        maxHeight: "88%",
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
        gap: spacing.md,
    },

    head: { gap: spacing.xs },
    logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    logoDot: {
        width: 10,
        height: 10,
        borderRadius: radius.pill,
        backgroundColor: colors.pulsePrimary,
    },
    logo: { ...type.label, color: colors.pulsePrimaryDark },
    title: { ...type.h2, color: colors.text },

    body: { flexGrow: 0 },
    bodyContent: { paddingBottom: spacing.sm },

    lede: { ...type.body, color: colors.text, marginBottom: spacing.lg },

    disclosure: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    disclosureText: { ...type.label, color: colors.blPrimary },
    disclosureChevron: { ...type.h3, color: colors.blPrimary },

    section: { paddingTop: spacing.lg, gap: spacing.xs },
    sectionHeading: { ...type.label, color: colors.text },
    sectionBody: { ...type.small, color: colors.textMuted },

    optional: {
        marginTop: spacing.xl,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderColor: colors.border,
        gap: spacing.lg,
    },
    optionalHeading: { ...type.caption, letterSpacing: 1, color: colors.textMuted },
    optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
    optionText: { flex: 1, gap: 2 },
    optionLabel: { ...type.bodyMedium, color: colors.text },
    optionDescription: { ...type.small, fontSize: 12, color: colors.textMuted },

    link: {
        ...type.label,
        color: colors.blPrimary,
        textDecorationLine: "underline",
        marginTop: spacing.xl,
    },

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