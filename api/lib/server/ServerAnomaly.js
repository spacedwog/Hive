class ServerAnomaly {
  detect(memoryUsedMB, memoryTotalMB, loadAverage) {
    const memThreshold = 0.8;
    const memRatio = memoryUsedMB / memoryTotalMB;

    if (memRatio > memThreshold) {
      return { detected: true, message: "Uso de memória acima do limite", current_value: Math.round(memRatio * 100) };
    }

    if (loadAverage > 1.0) {
      return { detected: true, message: "Carga da CPU alta", current_value: Math.round(loadAverage * 100) };
    }

    return { detected: false, message: "Normal", current_value: 0 };
  }
}

export default ServerAnomaly;