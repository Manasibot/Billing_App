/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,View
} from 'react-native';

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';
import BillListScreen from './src/screens/BillListScreen';
import HomeScreen from './src/screens/HomeScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NavigationContainer } from '@react-navigation/native'; 
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();
function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };
  const screenOptions = {
    tabBarActiveTintColor: '#007AFF',
    tabBarInactiveTintColor: 'gray',
    tabBarStyle: {
      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
      paddingBottom: 5,
      paddingTop: 5,
      height: 60,
    },
    headerStyle: {
      backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    },
    headerTintColor: isDarkMode ? '#ffffff' : '#000000',
  };
  return (
    <View style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <BillListScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
});

export default App;
