import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface GeoLocation {
    lat: number;
    lng: number;
    accuracy: number;
}

export const getCurrentLocation = async (): Promise<GeoLocation> => {
    try {
        // 1. Android/iOS: Check explicit permissions
        if (Capacitor.isNativePlatform()) {
            const permission = await Geolocation.checkPermissions();
            if (permission.location !== 'granted') {
                const request = await Geolocation.requestPermissions();
                if (request.location !== 'granted') {
                    throw new Error('Location permission denied on device.');
                }
            }
        }

        // 2. Try High Accuracy first (Best for Phones)
        try {
            const coordinates = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 3000, // Try quickly for 3s
                maximumAge: 0
            });
            return {
                lat: coordinates.coords.latitude,
                lng: coordinates.coords.longitude,
                accuracy: coordinates.coords.accuracy
            };
        } catch (err) {
            console.warn("High accuracy failed/timed out. Switching to low accuracy...");
        }

        // 3. FALLBACK: Low Accuracy (Best for PC/Indoor)
        // We increase timeout to 30 seconds and allow cached positions
        const fallbackCoords = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 30000,       // Wait up to 30 seconds
            maximumAge: Infinity  // Accept ANY cached location (instant)
        });

        return {
            lat: fallbackCoords.coords.latitude,
            lng: fallbackCoords.coords.longitude,
            accuracy: fallbackCoords.coords.accuracy
        };

    } catch (error: any) {
        console.error("GPS Error:", error);
        if (error.message && error.message.includes('User denied')) {
            throw new Error('You denied location access. Click the Lock icon 🔒 in the URL bar.');
        }
        throw new Error('Could not get location. Check Windows Location Settings.');
    }
};