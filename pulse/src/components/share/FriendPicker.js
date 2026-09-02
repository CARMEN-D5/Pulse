import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import Icon from "../Icon";
import { Alert, PrimaryButton } from "../ui";
import { subscribeToFriendships } from "../../firestore/friendship";
import { colors, radius, spacing, type } from "../../theme";

/*
 * Modal that presents the current user's friends and returns a chosen
 * friend to the caller via onPick.
 *
 * Used by the share popup's "Send to friend..." button. Kept as a pure
 * picker — actually sending the DM is the caller's responsibility, so
 * this component doesn't need to know about messages/uploads/anything.
 */
export default function FriendPicker({
                                         visible,
                                         user,
                                         posting = false,
                                         error,
                                         onPick,
                                         onClose,
                                     }) {
    const [friendships, setFriendships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUid, setSelectedUid] = useState(null);

    useEffect(() => {
        if (!visible || !user?.uid) return;
        setLoading(true);
        const unsub = subscribeToFriendships(user.uid, (list) => {
            setFriendships(list);
            setLoading(false);
        });
        return unsub;
    }, [visible, user?.uid]);

    const friends = useMemo(() => {
        return friendships
            .map((f) => {
                const otherUid = (f.participants || []).find((p) => p !== user?.uid);
                const info = f.participantInfo?.[otherUid] || {};
                return {
                    uid: otherUid,
                    name: info.name || info.email || "Someone",
                    email: info.email || null,
                };
            })
            .filter((f) => !!f.uid)
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [friendships, user?.uid]);

    const selected = friends.find((f) => f.uid === selectedUid) || null;

    const handleSend = () => {
        if (!selected || posting) return;
        onPick(selected);
    };

    const handleClose = () => {
        if (posting) return;
        setSelectedUid(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleClose}
        >
            <Pressable style={styles.overlay} onPress={handleClose} />
            <View style={styles.window} accessibilityViewIsModal accessibilityLabel="Pick a friend">
                <View style={styles.head}>
                    <View style={styles.iconBtnGhost} />
                    <Text style={styles.title}>Send to</Text>
                    <Pressable
                        onPress={handleClose}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        disabled={posting}
                        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                    >
                        <Icon name="close" size={20} color={colors.text} />
                    </Pressable>
                </View>

                {loading ? (
                    <View style={styles.loadingBlock}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={styles.loadingText}>Loading friends…</Text>
                    </View>
                ) : friends.length === 0 ? (
                    <View style={styles.emptyBlock}>
                        <Text style={styles.emptyText}>
                            You don't have any friends yet. Add one from the Social
                            tab first.
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        {friends.map((f) => {
                            const isSelected = f.uid === selectedUid;
                            return (
                                <Pressable
                                    key={f.uid}
                                    onPress={() => setSelectedUid(f.uid)}
                                    disabled={posting}
                                    style={({ pressed }) => [
                                        styles.row,
                                        isSelected && styles.rowSelected,
                                        pressed && styles.pressed,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Send to ${f.name}`}
                                    accessibilityState={{ selected: isSelected }}
                                >
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>
                                            {initialsFor(f.name)}
                                        </Text>
                                    </View>
                                    <View style={styles.rowBody}>
                                        <Text style={styles.rowName} numberOfLines={1}>
                                            {f.name}
                                        </Text>
                                        {f.email ? (
                                            <Text style={styles.rowEmail} numberOfLines={1}>
                                                {f.email}
                                            </Text>
                                        ) : null}
                                    </View>
                                    {isSelected ? (
                                        <View style={styles.check}>
                                            <Text style={styles.checkText}>✓</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.checkPlaceholder} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                )}

                <Alert message={error} />

                <PrimaryButton
                    label={posting ? "Sending…" : selected ? `Send to ${selected.name}` : "Send"}
                    onPress={handleSend}
                    disabled={!selected || posting}
                    loading={posting}
                />
            </View>
        </Modal>
    );
}

function initialsFor(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
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

    head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { ...type.h3, color: colors.text },
    iconBtn: { padding: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.rowTint },
    iconBtnGhost: { width: 28, height: 28 },

    list: { maxHeight: 360 },
    listContent: { gap: spacing.xs },

    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.sm,
        borderRadius: radius.md,
    },
    rowSelected: { backgroundColor: colors.rowTint },

    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },

    rowBody: { flex: 1 },
    rowName: { ...type.body, color: colors.text, fontWeight: "600" },
    rowEmail: { ...type.caption, color: colors.textMuted },

    check: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    checkText: { color: "#fff", fontWeight: "800", fontSize: 14 },
    checkPlaceholder: { width: 24, height: 24 },

    loadingBlock: { paddingVertical: spacing.xl, alignItems: "center", gap: spacing.sm },
    loadingText: { ...type.body, color: colors.textMuted },

    emptyBlock: { paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
    emptyText: {
        ...type.body,
        color: colors.textMuted,
        textAlign: "center",
        lineHeight: 22,
    },
});
