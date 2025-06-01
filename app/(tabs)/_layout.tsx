import { Redirect, Tabs } from 'expo-router';
import { FunctionComponent } from 'react';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import ThemeProvider from '@/context/themeProvider';
import useUser from '@/hooks/useUser';

const TabsLayout: FunctionComponent = () => {
  const user = useUser();

  if (!user) {
    return <Redirect href="/login/login" />;
  }

  return (
    <GluestackUIProvider mode="light">
      <ThemeProvider>
        <Tabs
          screenOptions={{
            headerShadowVisible: false,
            tabBarStyle: {
              borderTopWidth: 0,
              elevation: 0,
              shadowOffset: {
                width: 0,
                height: 0,
              },
            },
          }}>
          <Tabs.Screen
            name="home"
            options={{
              title: 'Home',
              headerShown: true,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="scanner"
            options={{
              title: 'Scanner',
              headerShown: false,
              tabBarIcon: ({ color, size }) => (
                <FontAwesome5 name="camera" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="budgetOverview"
            options={{
              title: 'Budget',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="attach-money" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person" size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </ThemeProvider>
    </GluestackUIProvider>
  );
};

export default TabsLayout;
