import React, { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../components/ui";
import { colors, radius, spacing, type } from "../theme";
import { contactEmail, NOTICE_SECTIONS, privacyPolicyUrl, SHORT_NOTICE } from "./consentNotice";

export default function ConsentModal({ visible, onAcknowledge, onDecline }) {
    const [expanded, setExpanded] = useState(false);

    const policyUrl = privacyPolicyUrl();
    const email = contactEmail();

    const openPolicy = async () => {
        if (!policyUrl) return;
        try {
            const supported = await Linking.canOpenURL(policyUrl);
            if (supported) await Linking.openURL(policyUrl);
            else console.debug("[Pulse] cannot open privacy policy URL", policyUrl);
        } catch (err) {
            console.debug("[Pulse] openURL failed", err?.message);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
            <View style={styles.overlay} />

            <View style={styles.window} accessibilityViewIsModal accessibilityLabel="Your privacy on Pulse">
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

                    {policyUrl ? (
                        <Pressable
                            onPress={openPolicy}
                            accessibilityRole="link"
                            style={({ pressed }) => pressed && styles.pressed}
                        >
                            <Text style={styles.link}>Read our full privacy policy</Text>
                        </Pressable>
                    ) : email ? (
                        // no policy site yet, but there is an address to ask at
                        <Text style={styles.fallback}>
                            For anything not covered here, contact us at {email}.
                        </Text>
                    ) : (
                        // contact details and website not available, can sub in once created.
                        <Text style={styles.fallback}>
                            This notice covers how Pulse handles your information. A full privacy policy will be
                            published with the app’s release.
                        </Text>
                    )}
                </ScrollView>

                <View style={styles.foot}>
                    <PrimaryButton label="I understand — continue" onPress={onAcknowledge} />

                    <Pressable
                        onPress={onDecline}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                    >
                        <Text style={styles.secondaryText}>Not now</Text>
                    </Pressable>
                </View>

                <Text style={styles.footnote}>
                    You will be asked about optional data before you start using Pulse.
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
    logoDot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.pulsePrimary },
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

    link: {
        ...type.label,
        color: colors.blPrimary,
        textDecorationLine: "underline",
        marginTop: spacing.xl,
    },
    fallback: { ...type.small, color: colors.textMuted, marginTop: spacing.xl },

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