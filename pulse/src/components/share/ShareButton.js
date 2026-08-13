import React from "react";
import { Pressable, StyleSheet } from "react-native";

import { useSharePrompt } from "./SharePromptProvider";
import { templatesFor } from "./shareTemplates";
import Icon from "../Icon";
import { colors, radius, spacing } from "../../theme";

/**
 * manual share option/trigger
 * set in the top right corner of a domain
 *
 *   <ShareButton domain="finance" payload={goal} />
 *
 * hides itself when there's nothing shareable yet, so the user never taps
 * into an empty prompt.
 */
export default function ShareButton({ domain, payload, style }) {
    const { openSharePrompt } = useSharePrompt();
    const available = templatesFor(domain, payload).length > 0;
    if (!available) return null;

    return (
        <Pressable
            onPress={() => openSharePrompt(domain, payload, { source: "manual" })}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Share to feed"
            style={({ pressed }) => [styles.btn, style, pressed && styles.pressed]}
        >
            <Icon name="share" size={20} color={colors.text} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: { padding: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.glass },
    pressed: { opacity: 0.7 },
});
