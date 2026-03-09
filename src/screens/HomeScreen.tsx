import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

const HomeScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDarkMode ? Colors.darker : Colors.lighter }
    ]}>
      <Text style={[
        styles.text,
        { color: isDarkMode ? Colors.white : Colors.black }
      ]}>
        Welcome to Home Screen!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default HomeScreen;