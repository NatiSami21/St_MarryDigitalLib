import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";

export default function IntroScreen() {
  const router = useRouter();
  const navigated = useRef(false); // 🔐 prevents double navigation

  const goNext = () => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace("/app");
  };

  const player = useVideoPlayer(
    require("../assets/intro-otona.mp4"),
    (player) => {
      player.loop = false;
      player.play();
    }
  );

  useEffect(() => {
    const timeout = setTimeout(goNext, 4000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const sub = player.addListener("playToEnd", goNext);
    return () => sub.remove();
  }, [player]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  video: { width: "100%", height: "100%" },
});
