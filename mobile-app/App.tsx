import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';

export default function App() {
  return (
    // Bọc SafeAreaProvider ở ngoài cùng để xử lý tai thỏ/bottom bar
    <SafeAreaProvider>
      // Bọc PaperProvider để cung cấp Theme (màu sắc, font) cho các component
      <PaperProvider>
        <View style={styles.container}>
          <Text style={styles.text}>Hệ thống WMS MiniFulfillment sẵn sàng!</Text>
          <StatusBar style="auto" />
        </View>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
  }
});