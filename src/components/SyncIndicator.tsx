import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { syncManager, SyncStatus } from '../SyncManager';

const SyncIndicator = () => {
    const [status, setStatus] = useState<SyncStatus>(syncManager.getStatus());
    const [opacity] = useState(new Animated.Value(0));

    useEffect(() => {
        const unsubscribe = syncManager.subscribe((newStatus) => {
            setStatus(newStatus);
            
            // Pulse animation when syncing
            if (newStatus === 'syncing' || newStatus === 'offline') {
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 0.6, duration: 500, useNativeDriver: true })
                ]).start();
            } else {
                Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
            }
        });

        return () => unsubscribe();
    }, []);

    const getStatusConfig = () => {
        switch (status) {
            case 'offline':
                return {
                    icon: 'cloud-offline-outline',
                    text: 'Working Offline',
                    color: '#FF6B6B',
                    bg: '#FFF0F0'
                };
            case 'syncing':
                return {
                    icon: 'sync-outline',
                    text: 'Syncing...',
                    color: '#4ECDC4',
                    bg: '#E0F9F7'
                };
            case 'synced':
                return {
                    icon: 'cloud-done-outline',
                    text: 'All data synced',
                    color: '#45B649',
                    bg: '#E8F5E9'
                };
            case 'initializing':
            default:
                return {
                    icon: 'cloud-download-outline',
                    text: 'Initializing...',
                    color: '#999',
                    bg: '#F5F5F5'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <Animated.View style={[
            styles.container, 
            { backgroundColor: config.bg, opacity: status === 'syncing' || status === 'offline' ? opacity : 1 }
        ]}>
            <IonIcon name={config.icon} size={14} color={config.color} />
            <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginVertical: 4,
        gap: 6,
    },
    text: {
        fontSize: 11,
        fontWeight: '600',
    }
});

export default SyncIndicator;
