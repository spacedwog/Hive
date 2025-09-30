import React from "react";
import { StyleSheet, Text, View } from "react-native";

export class SparkBar {
  width: number;
  height: number;
  data: number[];

  constructor(data: number[], width: number, height = 120) {
    this.data = data;
    this.width = width;
    this.height = height;
  }

  render() {
    const n = Math.max(this.data.length, 1);
    const barGap = 2;
    const barWidth = Math.max(2, Math.floor((this.width - (n - 1) * barGap) / n));

    return (
      <View style={[styles.chartBox, { width: this.width, height: this.height }]}>
        <View style={styles.chartAxis} />
        <View style={styles.chartBarsRow}>
          {this.data.map((v, i) => {
            const clamped = Math.max(0, Math.min(100, v));
            const h = Math.max(2, Math.round((clamped / 100) * (this.height - 16)));
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