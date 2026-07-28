// components/Icon.tsx
//
// Thin wrapper around a single <Path> so call sites can just pass a
// Heroicons-style `d` string (this codebase uses the outline set from
// heroicons.com) plus size/color/strokeWidth, without importing a whole
// icon library per-icon.
//
// variant="stroke" (default): outline icon, `d` is drawn as a stroked path
//   with no fill — this is how nearly every icon in BusinessesPage is used.
// variant="fill": solid icon, `d` is drawn as a filled path with no stroke
//   — used for the 3-dot menu button, which is a filled glyph in Heroicons'
//   solid set rather than outline.
//
// Requires `react-native-svg` (already a transitive dep of most RN nav
// stacks, but install explicitly if not present):
//   npm install react-native-svg

import React from 'react'
import Svg, { Path } from 'react-native-svg'

type IconVariant = 'stroke' | 'fill'

type IconProps = {
    // SVG path data, viewBox 0 0 24 24 (Heroicons default grid).
    d: string
    size?: number
    color?: string
    strokeWidth?: number
    variant?: IconVariant
}

export default function Icon({
    d,
    size = 24,
    color = '#000000',
    strokeWidth = 1.5,
    variant = 'stroke',
}: IconProps) {
    const isFill = variant === 'fill'

    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d={d}
                fill={isFill ? color : 'none'}
                stroke={isFill ? 'none' : color}
                strokeWidth={isFill ? 0 : strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    )
}
