import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BottomNav = () => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.navItem}>
        <Text style={styles.navText}>Dashboard</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem}>
        <Text style={styles.navText}>Sensores</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem}>
        <Text style={styles.navText}>Configurações</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  navItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navText: {
    color: '#facc15',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BottomNav;
