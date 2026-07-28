import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Polyline, Circle, Line as SvgLine } from 'react-native-svg'

type Point = { day: number; total: number }

// Replaces recharts' <LineChart>/<Line>/<Tooltip> combo used on web for
// the "This Month" sparkline. Recharts is a DOM/SVG-in-browser library
// and doesn't work in React Native; react-native-svg is the standard
// substitute for drawing the same line here. Tooltip-on-hover has no
// mobile equivalent, so this shows the value for the last data point
// (or the point nearest a tap) as a small inline label instead.
export default function MiniLineChart({
    data,
    height = 96,
    stroke = '#3B82F6',
    formatValue,
}: {
    data: Point[]
    height?: number
    stroke?: string
    formatValue?: (n: number) => string
}) {
    const [width, setWidth] = useState(0)

    if (data.length === 0) {
        return <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} />
    }

    const max = Math.max(1, ...data.map((d) => d.total))
    const min = Math.min(0, ...data.map((d) => d.total))
    const range = max - min || 1
    const padding = 4

    const points = data.map((d, i) => {
        const x = width > 0 ? (i / Math.max(1, data.length - 1)) * width : 0
        const y = padding + (1 - (d.total - min) / range) * (height - padding * 2)
        return { x, y, ...d }
    })

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')
    const last = points[points.length - 1]

    return (
        <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {width > 0 && (
                <Svg width={width} height={height}>
                    <SvgLine x1={0} y1={height - padding} x2={width} y2={height - padding} stroke="#F3F4F6" strokeWidth={1} />
                    <Polyline points={polylinePoints} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                    {last && <Circle cx={last.x} cy={last.y} r={3} fill={stroke} />}
                </Svg>
            )}
        </View>
    )
}
