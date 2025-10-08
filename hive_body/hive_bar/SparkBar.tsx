// Novo arquivo SparkBar.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type SparkBarProps = {
  data: number[];
  width: number;
  height?: number;
};

export class SparkBar extends React.Component<SparkBarProps> {
  static defaultProps = {
    height: 120,
  };

  render() {
    const { data, width, height } = this.props;
    const n = Math.max(data.length, 1);
    const barGap = 2;
    const barWidth = Math.max(2, Math.floor((width - (n - 1) * barGap) / n));

    return (
      <View style={[styles.chartBox, { width, height }]}>
        <View style={styles.chartAxis} />
        <View style={styles.chartBarsRow}>
          {data.map((v, i) => {
            const clamped = Math.max(0, Math.min(100, v));
            const h = Math.max(2, Math.round((clamped / 100) * (height! - 16)));
            return (
              <View
                key={`${i}-${v}`}
                style={[styles.chartBar, { width: barWidth, height: h, marginRight: i === n - 1 ? 0 : barGap }]}
              />
            );
          })}
        </View>
        <View style={styles.chartLabels}>
          <Text style={styles.chartLabelText}>0%</Text>
          <Text style={styles.chartLabelText}>100%</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  chartBox: { position: "relative", justifyContent: "flex-end", backgroundColor: "#eee", borderRadius: 6, padding: 4 },
  chartAxis: { position: "absolute", left: 0, bottom: 0, height: "100%", width: 1, backgroundColor: "#888" },
  chartBarsRow: { flexDirection: "row", alignItems: "flex-end" },
  chartBar: { backgroundColor: "#3b82f6", borderRadius: 2 },
  chartLabels: { flexDirection: "row", justifyContent: "space-between" },
  chartLabelText: { fontSize: 10 },
});