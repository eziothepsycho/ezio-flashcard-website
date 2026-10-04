import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionProvider, useSession } from "./src/lib/auth/session.js";
import HomeScreen from "./src/screens/HomeScreen.jsx";
import LoadingScreen from "./src/screens/LoadingScreen.jsx";
import LoginScreen from "./src/screens/LoginScreen.jsx";
import QuizScreen from "./src/screens/QuizScreen.jsx";
import RegisterScreen from "./src/screens/RegisterScreen.jsx";
import SetDetailScreen from "./src/screens/SetDetailScreen.jsx";
import StudyScreen from "./src/screens/StudyScreen.jsx";
import { colors } from "./src/theme/tokens";

const Stack = createNativeStackNavigator();

// React Navigation's own theme, recoloured with the site's tokens. It is spread
// from DarkTheme rather than written by hand so the theme keeps the `fonts`
// object the navigator expects.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.ink,
    border: colors.border,
    notification: colors.danger,
  },
};

// The signed-in state decides which stack exists at all: a signed-out user can
// only reach Login and Register, so no screen has to guard itself.
function Root() {
  const { user, restoring } = useSession();

  // The stored session is still being read off the device (no request involved).
  if (restoring) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="SetDetail" component={SetDetailScreen} />
            <Stack.Screen name="Study" component={StudyScreen} />
            <Stack.Screen name="Quiz" component={QuizScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Root />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
