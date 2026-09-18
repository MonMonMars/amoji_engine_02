import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.amoji.companion",
  appName: "Amoji",
  webDir: "../app",
  server: {
    // Production: load hosted web app (companion + APIs on Vercel)
    url: process.env.AMOJI_MOBILE_SERVER_URL || "https://temporary-rushing-oxygen-ok5jzhd.vercel.app/app",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "automatic",
    scheme: "Amoji",
    backgroundColor: "#070a12",
  },
  android: {
    backgroundColor: "#070a12",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: "#070a12",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
