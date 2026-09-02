import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { Card, PrimaryButton, Screen } from "../components/ui";
import { colors, domainColors, fonts, radius, spacing, type } from "../theme";
import { OPTIONAL_CONSENTS, SENSITIVE_NOTICE, SHORT_NOTICE } from "./consentNotice";

export default function ConsentScreen({ onComplete, loading = false }) {
    const [choices, setChoices] = useState(() =>
        Object.fromEntries(OPTIONAL_CONSENTS.map((o) => [o.key, false]))
    );

    const toggle = (key) => setChoices((prev) => ({ ...prev, [key]: !prev[key] }));

    const submit = (overrides = null) => {
        const c = overrides ?? choices;
        onComplete({
            analytics: Boolean(c.analyticsConsent),
            reminders: Boolean(c.remindersConsent),
        });
    };

    return (
        <Screen contentContainerStyle={styles.screen}>
            <Card style={styles.card}>
                <View style={styles.brand}>
                    <View style={styles.brandRow}>
                        <View style={styles.logoDot} />
                        <Text style={styles.logo}>Pulse</Text>
                    </View>
                    <Text style={styles.tagline}>Before you start</Text>
                </View>

                <Text style={styles.recap}>{SHORT_NOTICE}</Text>

                {/* Sensitive information — stated, not switchable. */}
                <View style={styles.group}>
                    <View style={styles.sensitiveHead}>
                        <View style={[styles.dot, { backgroundColor: domainColors.health }]} />
                        <View style={[styles.dot, { backgroundColor: domainColors.spirituality }]} />
                        <Text style={styles.groupHeading}>{SENSITIVE_NOTICE.heading}</Text>
                    </View>
                    <Text style={styles.groupBody}>{SENSITIVE_NOTICE.body}</Text>
                    <View style={styles.agreementBox}>
                        <Text style={styles.agreementText}>{SENSITIVE_NOTICE.agreement}</Text>
                    </View>
                </View>

                {OPTIONAL_CONSENTS.length ? (
                    <View style={styles.group}>
                        <Text style={styles.groupHeading}>Optional extras</Text>
                        <Text style={styles.groupBody}>
                            Neither of these is needed to run Pulse. Leave them off and nothing changes.
                        </Text>
                        {OPTIONAL_CONSENTS.map((o) => {
                            const on = choices[o.key];
                            return (
                                <View
                                    key={o.key}
                                    style={[
                                        styles.row,
                                        {
                                            borderColor: on ? `${colors.blPrimary}55` : colors.border,
                                            backgroundColor: on ? `${colors.blPrimary}12` : "rgba(255,255,255,0.5)",
                                        },
                                    ]}
                                >
                                    <View style={styles.rowText}>
                                        <Text style={[styles.rowLabel, on && { color: colors.blPrimary }]}>
                                            {o.label}
                                        </Text>
                                        <Text style={styles.rowDescription}>{o.description}</Text>
                                    </View>
                                    <Switch
                                        value={on}
                                        onValueChange={() => toggle(o.key)}
                                        accessibilityLabel={o.label}
                                        trackColor={{ false: colors.blOutlineVariant, true: colors.blPrimary }}
                                        thumbColor={colors.card}
                                    />
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                <PrimaryButton
                    label="I agree — continue"
                    onPress={() => submit()}
                    loading={loading}
                    style={styles.submit}
                />

                <Pressable
                    onPress={() => submit({})}
                    disabled={loading}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                >
                    <Text style={styles.secondaryText}>Continue without the extras</Text>
                </Pressable>

                <Text style={styles.footnote}>
                    You can change the optional settings, or delete your account and everything in it, at any
                    time in your profile.
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
    sensitiveHead: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 8, height: 8, borderRadius: radius.pill },
    groupHeading: { ...type.title, color: colors.text },
    groupBody: { ...type.small, color: colors.textMuted, marginBottom: spacing.xs },

    agreementBox: {
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: colors.accentSoft,
        borderWidth: 1,
        borderColor: colors.border,
    },
    agreementText: { ...type.small, fontFamily: fonts.semibold, color: colors.text },

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