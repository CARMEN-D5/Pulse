import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, spacing, type } from "../../theme";

/*
 * template carousel of different templates
 * scroll/swipe/arrow/dot actions when there is more than one template avaialble
 * one template will be stationary
 *
 * The web build measured child offsets against scrollLeft to find the nearest
 * slide. React Native gives paging for free: every slide is exactly the track
 * width, so the settled index is scroll offset / width.
 */
export default function TemplateCarousel({
                                             templates,
                                             index,
                                             onIndexChange,
                                             payload,
                                             username,
                                         }) {
    const trackRef = useRef(null);
    const [width, setWidth] = useState(0);
    const single = templates.length === 1;

    // Keep the track in step when the index changes from the arrows or dots.
    useEffect(() => {
        if (!width) return;
        trackRef.current?.scrollTo({ x: index * width, animated: true });
    }, [index, width]);

    const handleMomentumEnd = (e) => {
        if (!width) return;
        const nearest = Math.round(e.nativeEvent.contentOffset.x / width);
        if (nearest !== index) onIndexChange(nearest);
    };

    const step = (delta) => {
        const next = Math.min(templates.length - 1, Math.max(0, index + delta));
        onIndexChange(next);
    };

    return (
        <View style={styles.carousel}>
            <View style={styles.trackRow}>
                {!single && (
                    <Pressable
                        onPress={() => step(-1)}
                        disabled={index === 0}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Previous template"
                        style={({ pressed }) => [
                            styles.nav,
                            index === 0 && styles.navDisabled,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Text style={styles.navText}>‹</Text>
                    </Pressable>
                )}

                <View style={styles.trackWrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
                    <ScrollView
                        ref={trackRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={handleMomentumEnd}
                        scrollEnabled={!single}
                        accessibilityLabel="Share templates"
                    >
                        {templates.map((t, i) => (
                            <View
                                key={t.id}
                                style={[styles.slide, width ? { width } : null]}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: i === index }}
                            >
                                {t.render(payload, { username })}
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {!single && (
                    <Pressable
                        onPress={() => step(1)}
                        disabled={index === templates.length - 1}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Next template"
                        style={({ pressed }) => [
                            styles.nav,
                            index === templates.length - 1 && styles.navDisabled,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Text style={styles.navText}>›</Text>
                    </Pressable>
                )}
            </View>

            <View style={styles.meta}>
                <Text style={styles.label}>{templates[index]?.label}</Text>
                {!single && (
                    <View style={styles.dots}>
                        {templates.map((t, i) => (
                            <Pressable
                                key={t.id}
                                onPress={() => onIndexChange(i)}
                                hitSlop={6}
                                accessibilityRole="button"
                                accessibilityLabel={`Template ${i + 1}: ${t.label}`}
                                style={[styles.dot, i === index && styles.dotActive]}
                            />
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    carousel: { gap: spacing.md },
    pressed: { opacity: 0.7 },

    trackRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    trackWrap: { flex: 1 },
    slide: { paddingHorizontal: 2 },

    nav: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
        backgroundColor: colors.rowTint,
    },
    navDisabled: { opacity: 0.35 },
    navText: { ...type.h3, color: colors.text },

    meta: { alignItems: "center", gap: spacing.sm },
    label: { ...type.label, color: colors.textMuted },
    dots: { flexDirection: "row", gap: spacing.xs },
    dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.blPrimary, width: 20 },
});
