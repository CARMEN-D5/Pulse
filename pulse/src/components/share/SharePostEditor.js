import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Alert, PrimaryButton } from "../ui";
import { colors, radius, spacing, type } from "../../theme";

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
        <View style={styles.editor}>
            <View style={styles.preview}>{template.render(payload, { username })}</View>

            <View style={styles.field}>
                <View style={styles.fieldHead}>
                    <Text style={styles.fieldLabel}>What I did to improve</Text>
                    <Text style={styles.fieldCount}>
                        {reflection.length}/{REFLECTION_MAX}
                    </Text>
                </View>
                <TextInput
                    style={[styles.input, styles.inputArea]}
                    value={reflection}
                    maxLength={REFLECTION_MAX}
                    onChangeText={setReflection}
                    placeholder="Say something about it…"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                />
            </View>

            <Alert message={error} />

            <View style={styles.foot}>
                <PrimaryButton
                    label="Not now"
                    variant="danger"
                    onPress={onCancel}
                    disabled={posting}
                    style={styles.flex}
                />
                <PrimaryButton
                    label={posting ? "Posting…" : "Share to feed"}
                    onPress={() => canPost && onSubmit({ reflection: reflection.trim() })}
                    disabled={!canPost}
                    loading={posting}
                    style={styles.flex}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    editor: { gap: spacing.md },
    preview: { alignSelf: "stretch" },

    field: { gap: spacing.sm },
    fieldHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    fieldLabel: { ...type.label, color: colors.text },
    fieldCount: { ...type.caption, color: colors.textMuted },
    input: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        ...type.body,
        color: colors.text,
    },
    inputArea: { minHeight: 84 },

    foot: { flexDirection: "row", gap: spacing.sm },
});
