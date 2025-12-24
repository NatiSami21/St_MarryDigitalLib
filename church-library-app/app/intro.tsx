import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Video, ResizeMode } from "expo-av";

export default function IntroScreen() {
  const router = useRouter();

  // Fallback safety: if video fails or hangs, move on after 2.2s
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/");
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Video
        source={require("../assets/intro-otona.mp4")}
        style={styles.video}
        shouldPlay
        isLooping={false}
        resizeMode={ResizeMode.COVER}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) {
            router.replace("/");
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});
