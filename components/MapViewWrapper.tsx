import { Platform, Text, View } from "react-native";

import React, { useEffect, useState } from "react";

let DefaultMapView: any = View;
let DefaultMarker: any = () => null;
let DefaultCallout: any = View;

export default function MapViewWrapper(props: any) {
  const [MapView, setMapView] = useState<any>(DefaultMapView);
  const [, setMarker] = useState<any>(DefaultMarker);
  const [, setCallout] = useState<any>(DefaultCallout);

  useEffect(() => {
    if (Platform.OS !== "web") {
      import("react-native-maps").then((RNMaps) => {
        setMapView(() => RNMaps.default);
        setMarker(() => RNMaps.Marker);
        setCallout(() => RNMaps.Callout);
      });
    }
  }, []);

  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>🗺️ Mapa não disponível no Web</Text>
      </View>
    );
  }

  if (MapView === DefaultMapView) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Carregando mapa...</Text>
      </View>
    );
  }

  return <MapView {...props}>{props.children}</MapView>;
}

export { DefaultCallout as Callout, DefaultMapView as MapView, DefaultMarker as Marker };
