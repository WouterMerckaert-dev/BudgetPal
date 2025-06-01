import { Redirect } from 'expo-router';
import { FunctionComponent } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import useUser from '@/hooks/useUser';
import { StyleSheet } from 'react-native';

const Index: FunctionComponent = () => {
  const user = useUser();

  return (
    <GestureHandlerRootView style={styles.container}>
      {!user ? <Redirect href="/login/login" /> : <Redirect href="/(tabs)/home" />}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // Zorg ervoor dat het de hele schermruimte inneemt
  },
});

export default Index;
