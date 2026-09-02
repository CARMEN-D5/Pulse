import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { Card, PrimaryButton, Screen } from "../components/ui";
import { colors, domainColors, radius, spacing, type } from "../theme";
import { OPTIONAL_CONSENTS, SENSITIVE_CONSENT, SHORT_NOTICE } from "./consentNotice";

const ROW_ACCENT = {
    healthConsent: domainColors.health,
    spiritualityConsent: domainColors.spirituality,
};

export default function ConsentScreen({ onComplete, loading = false }) {
    const [choices, setChoices] = useState(() => ({
        ...Object.fromEntries(SENSITIVE_CONSENT.items.map((i) => [i.key, false])),
        ...Object.fromEntries(OPTIONAL_CONSENTS.map((o) => [o.key, false])),
    }));

    const toggle = (key) => setChoices((prev) => ({ ...prev, [key]: !prev[key] }));

    const submit = (overrides = null) => {
        const c = overrides ?? choices;
        onComplete({
            health: Boolean(c.healthConsent),
            spirituality: Boolean(c.spiritualityConsent),
            analytics: Boolean(c.analyticsConsent),
            reminders: Boolean(c.remindersConsent),
        });
    };

    const declineAll = () => submit({});

    const renderRow = (item, accent) => {
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
    };

    return (
        <Screen contentContainerStyle={styles.screen}>
            <Card style={styles.card}>
                <View style={styles.brand}>
                    <View style={styles.brandRow}>
                        <View style={styles.logoDot} />
                        <Text style={styles.logo}>Pulse</Text>
                    </View>
                    <Text style={styles.tagline}>Two quick choices before you start</Text>
                </View>

                <Text style={styles.recap}>{SHORT_NOTICE}</Text>

                <View style={styles.group}>
                    <Text style={styles.groupHeading}>{SENSITIVE_CONSENT.heading}</Text>
                    <Text style={styles.groupBody}>{SENSITIVE_CONSENT.body}</Text>
                    {SENSITIVE_CONSENT.items.map((item) =>
                        renderRow(item, ROW_ACCENT[item.key] ?? colors.blPrimary)
                    )}
                </View>

                {OPTIONAL_CONSENTS.length ? (
                    <View style={styles.group}>
                        <Text style={styles.groupHeading}>Optional extras</Text>
                        <Text style={styles.groupBody}>
                            Neither of these is needed to run Pulse. Leave them off and nothing changes.
                        </Text>
                        {OPTIONAL_CONSENTS.map((o) => renderRow(o, colors.blPrimary))}
                    </View>
                ) : null}

                <PrimaryButton
                    label="Continue"
                    onPress={() => submit()}
                    loading={loading}
                    style={styles.submit}
                />

                <Pressable
                    onPress={declineAll}
                    disabled={loading}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                >
                    <Text style={styles.secondaryText}>Skip all of these</Text>
                </Pressable>

                <Text style={styles.footnote}>
                    Whatever you choose, you can change it later in your profile.
                </Text>
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { paddingVertical: spacing.xl },
    card: { maxWidth: 520, alignSelf: "center" },
    pressed: { opacity: 0.7 },

    brand: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.lg },
    brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    logoDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.pulsePrimary },
    logo: { ...type.h2, color: colors.pulsePrimaryDark },
    tagline: { ...type.small, color: colors.textMuted },

    recap: { ...type.small, color: colors.textMuted, marginBottom: spacing.lg },

    group: {
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    groupHeading: { ...type.title, color: colors.text },
    groupBody: { ...type.small, color: colors.textMuted, marginBottom: spacing.xs },

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

    submit: { marginTop: spacing.sm },
    secondary: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.lg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.blOutlineVariant,
        backgroundColor: "rgba(255,255,255,0.6)",
        marginTop: spacing.sm,
    },
    secondaryText: { ...type.title, fontSize: 16, color: colors.blOnSurface },

    footnote: {
        ...type.caption,
        fontSize: 11,
        color: colors.textMuted,
        textAlign: "center",
        marginTop: spacing.md,
    },
});