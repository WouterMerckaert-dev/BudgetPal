import {FunctionComponent} from 'react'
import ThemeProvider from '../context/themeProvider'
import {Stack} from 'expo-router'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {GestureHandlerRootView} from 'react-native-gesture-handler'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: !__DEV__,
      staleTime: Infinity,
    },
  },
})

const RootLayout: FunctionComponent = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={[{flex: 1}]}>
        <ThemeProvider>
          <Stack>
            <Stack.Screen
              name="index"
              options={{
                title: 'Home',
                headerShown: false,
              }}
            />

            <Stack.Screen name="login/login" options={{title: 'Login'}} />

            <Stack.Screen name="(tabs)" options={{headerShown: false}} />
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  )
}

export default RootLayout
