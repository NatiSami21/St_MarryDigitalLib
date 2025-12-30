// app/intro.tsx
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";

export default function IntroScreen() {
  const router = useRouter();

  const player = useVideoPlayer(
    require("../assets/intro-otona.mp4"),
    (player) => {
      player.loop = false;
      player.play();
    }
  );

  /**
   * Safety fallback (never block the app)
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/");
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Navigate when video ends
   */
  useEffect(() => {
    const sub = player.addListener("playToEnd", () => {
      router.replace("/");
    });

    return () => sub.remove();
  }, [player]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"   // ✅ replaces resizeMode
        allowsFullscreen={false}
        allowsPictureInPicture={false}
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
    width: "100%",
    height: "100%",
  },
});
