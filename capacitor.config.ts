import type { CapacitorConfig } from "@capacitor/cli";

// Android and iOS apps wrap the same static site (`npm run build` -> out/).
// Run `npm run app:sync` after any web change to copy it into both projects.
const config: CapacitorConfig = {
  appId: "com.syntheticpush.futurejournal",
  appName: "FutureJournal",
  webDir: "out",
  backgroundColor: "#fbf6ee",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_futurejournal",
      iconColor: "#5f4b8b",
    },
  },
};

export default config;
