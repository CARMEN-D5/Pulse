// Icon shim for the Material Symbols glyphs the web build used.
//
// On the web, icons were `<span className="material-symbols-outlined">name</span>`
// backed by a Google Fonts stylesheet. React Native has no equivalent, so this
// renders the same glyph out of @expo/vector-icons instead.
//
// Material Symbols names map onto the MaterialIcons set almost one-for-one
// after swapping underscores for hyphens, so that is the default. Only the
// handful of names with no MaterialIcons counterpart need an entry in
// OVERRIDES below.
import React from "react";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

import { colors } from "../theme";

// Material Symbols name -> { set, name } for glyphs MaterialIcons lacks.
const OVERRIDES = {
  potted_plant: { set: "community", name: "flower-tulip" },
  self_care: { set: "community", name: "hand-heart" },
  meditation: { set: "community", name: "meditation" },
  target: { set: "community", name: "target" },
};

export default function Icon({ name, size = 24, color = colors.blOnSurface, style }) {
  const override = OVERRIDES[name];

  if (override?.set === "community") {
    return <MaterialCommunityIcons name={override.name} size={size} color={color} style={style} />;
  }

  return (
    <MaterialIcons
      name={override?.name ?? name.replace(/_/g, "-")}
      size={size}
      color={color}
      style={style}
    />
  );
}
