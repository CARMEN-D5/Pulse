import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Alert, PrimaryButton } from "../ui";
import { colors, radius, spacing, type } from "../../theme";
import { pickImage } from "../../storage/uploads";

const REFLECTION_MAX = 280;

/*
 * Editor step of the share popup.
 *
 * The reflection is pre-filled from the template and can be edited.
 * The user can also attach an optional photo — same photo path used
 * whether the post ends up on the feed or as a DM to a friend.
 *
 * Two submit buttons at the bottom:
 *   - "Share to feed"      → posts publicly (visible to friends)
 *   - "Send to friend..."  → opens the friend picker, sends as a DM
 *
 * Both call the same onSubmit callback with a `destination` field so
 * the parent popup can route accordingly.
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
    const [imageAsset, setImageAsset] = useState(null);
    const [pickError, setPickError] = useState("");

    const canPost = reflection.trim().length > 0 && !posting;

    const handlePickImage = async () => {
        setPickError("");
        const res = await pickImage();
        if (res.ok) {
            setImageAsset(res.asset);
        } else if (!res.canceled && res.error) {
            setPickError(res.error);
        }
    };

    const handleClearImage = () => setImageAsset(null);

    const submit = (destination) =>
        canPost &&
        onSubmit({
            reflection: reflection.trim(),
            imageAsset,
            destination,
        });

    return (
        <View style={styles.editor}>
            <View style={styles.preview}>{template.render(payload, { username })}</View>

            {/* ---------------- Photo picker ---------------- */}
            <Pressable
                onPress={handlePickImage}
                accessibilityRole="button"
                accessibilityLabel={imageAsset ? "Change photo" : "Add a photo"}
                style={({ pressed }) => [
                    styles.imagePicker,
                    imageAsset && styles.imagePickerWithImage,
                    pressed && styles.pressed,
                ]}
                disabled={posting}
            >
                {imageAsset ? (
                    <>
                        <Image
                            source={{ uri: imageAsset.uri }}
                            style={styles.imagePreview}
                            resizeMode="cover"
                        />
                        <View style={styles.imageActions}>
                            <Pressable
                                onPress={handleClearImage}
                                accessibilityRole="button"
                                accessibilityLabel="Remove photo"
                                hitSlop={8}
                                style={({ pressed }) => [
                                    styles.removeBtn,
                                    pressed && styles.pressed,
                                ]}
                                disabled={posting}
                            >
                                <Text style={styles.removeBtnText}>×</Text>
                            </Pressable>
                        </View>
                    </>
                ) : (
                    <View style={styles.imagePickerEmpty}>
                        <Text style={styles.imagePickerIcon}>📷</Text>
                        <Text style={styles.imagePickerLabel}>Add a photo (optional)</Text>
                    </View>
                )}
            </Pressable>

            <Alert message={pickError} />

            {/* ---------------- Reflection ---------------- */}
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
                    editable={!posting}
                />
            </View>

            <Alert message={error} />

            {/* ---------------- Destination buttons ---------------- */}
            <View style={styles.footRow}>
                <PrimaryButton
                    label={posting ? "Posting…" : "Share to feed"}
                    onPress={() => submit("feed")}
                    disabled={!canPost}
                    loading={posting}
                    style={styles.flex}
                />
                <PrimaryButton
                    label="Send to friend"
                    variant="secondary"
                    onPress={() => submit("dm")}
                    disabled={!canPost}
                    style={styles.flex}
                />
            </View>

            <PrimaryButton
                label="Not now"
                variant="danger"
                onPress={onCancel}
                disabled={posting}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    pressed: { opacity: 0.7 },
    editor: { gap: spacing.md },
    preview: { alignSelf: "stretch" },

    // Photo picker — matches the visual language of the Today-tab composer.
    imagePicker: {
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.rowTint,
        overflow: "hidden",
        minHeight: 120,
        justifyContent: "center",
        alignItems: "center",
    },
    imagePickerEmpty: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.lg,
        gap: 4,
    },
    imagePickerIcon: { fontSize: 26 },
    imagePickerLabel: { ...type.body, color: colors.textMuted, fontWeight: "600" },
    imagePickerWithImage: {
        backgroundColor: colors.card,
        minHeight: 180,
    },
    imagePreview: { width: "100%", height: 220 },
    imageActions: {
        position: "absolute",
        top: 8,
        right: 8,
        flexDirection: "row",
        gap: spacing.xs,
    },
    removeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
    },
    removeBtnText: { color: "#fff", fontSize: 22, lineHeight: 22, fontWeight: "700" },

    // Reflection
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

    // Footer
    footRow: { flexDirection: "row", gap: spacing.sm },
});
