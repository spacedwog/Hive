import { Platform, Text, View } from "react-native";
import MapView from "react-native-maps";

export default function MapViewWrapper(props: any) {
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Map not available on Web</Text>
      </View>
    );
  }
  return <MapView {...props}>{props.children}</MapView>;
}