import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

type Level = 'Amatir' | 'Junior' | 'Senior';
type SlaOption = 2 | 4 | 6;

type DashboardUser = {
  level: Level;
  zone: 1 | 2 | 3 | 4;
  subsidyMargin: string;
};

type DeliveryState = {
  startedAt: number;
  deadlineAt: number;
  slaHours: SlaOption;
};

const COLORS = {
  background: '#F9FAFB',
  text: '#1C1917',
  active: '#4D7C0F',
  error: '#991B1B',
};

const userData: DashboardUser = {
  level: 'Junior',
  zone: 2,
  subsidyMargin: '8%',
};

const toVirtualEmail = (phone: string) => `${phone}@agrikarta.com`;

const authWithVirtualEmail = async (payload: { email: string; pin: string }) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return payload;
};

const cancelDeliveryApi = async () => {
  await new Promise((resolve) => setTimeout(resolve, 300));
};

const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

export default function App() {
  const [fontsLoaded] = useFonts({ JetBrainsMono_400Regular });
  const [phone, setPhone] = useState('+62');
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [authenticatedEmail, setAuthenticatedEmail] = useState<string | null>(null);

  const [commodity, setCommodity] = useState('');
  const [quantity, setQuantity] = useState('');
  const [bookingMessage, setBookingMessage] = useState('Belum ada soft booking aktif.');

  const [selectedSla, setSelectedSla] = useState<SlaOption>(2);
  const [delivery, setDelivery] = useState<DeliveryState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [operationError, setOperationError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const deliveryRemainingMs = useMemo(() => {
    if (!delivery) {
      return 0;
    }
    return Math.max(0, delivery.deadlineAt - now);
  }, [delivery, now]);

  const cooldownRemainingMs = useMemo(() => {
    if (!cooldownUntil) {
      return 0;
    }
    return Math.max(0, cooldownUntil - now);
  }, [cooldownUntil, now]);

  const canShowExtension = Boolean(delivery && deliveryRemainingMs > 0 && deliveryRemainingMs < 60 * 60 * 1000);

  const handleLogin = async () => {
    setAuthError('');

    if (!/^\+62\d{8,13}$/.test(phone)) {
      setAuthError('Nomor telepon harus berformat +62...');
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      setAuthError('PIN harus 6 digit angka.');
      return;
    }

    const virtualEmail = toVirtualEmail(phone);

    try {
      setLoginLoading(true);
      await authWithVirtualEmail({ email: virtualEmail, pin });
      setAuthenticatedEmail(virtualEmail);
    } catch {
      setAuthError('Autentikasi gagal. Coba lagi.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSoftBooking = () => {
    setOperationError('');

    if (!commodity.trim()) {
      setOperationError('Komoditas wajib diisi.');
      return;
    }

    if (!/^\d+$/.test(quantity) || Number(quantity) <= 0) {
      setOperationError('Jumlah restock harus angka positif.');
      return;
    }

    setBookingMessage(`Soft booking: ${commodity.trim()} x${quantity}`);
    setCommodity('');
    setQuantity('');
  };

  const handleStartDelivery = () => {
    if (cooldownRemainingMs > 0) {
      setOperationError('Masih cooldown pembatalan 2 jam.');
      return;
    }

    const startTime = Date.now();
    setOperationError('');
    setDelivery({
      startedAt: startTime,
      deadlineAt: startTime + selectedSla * 60 * 60 * 1000,
      slaHours: selectedSla,
    });
  };

  const handleEmergencyExtension = () => {
    setDelivery((previous) =>
      previous
        ? {
            ...previous,
            deadlineAt: previous.deadlineAt + 3 * 60 * 60 * 1000,
          }
        : previous,
    );
  };

  const handleManualCancel = async () => {
    await cancelDeliveryApi();
    setDelivery(null);
    setCooldownUntil(Date.now() + 2 * 60 * 60 * 1000);
  };

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator color={COLORS.active} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.pageContent}>
        {!authenticatedEmail ? (
          <View style={styles.containerBlock}>
            <Text style={styles.title}>Masuk Pengepul (Zero-OTP)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              placeholder="+628123456789"
              placeholderTextColor={COLORS.text}
            />
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="PIN 6 digit"
              placeholderTextColor={COLORS.text}
            />
            {!!authError && <Text style={styles.errorText}>{authError}</Text>}
            <Pressable style={styles.button} onPress={handleLogin} disabled={loginLoading}>
              <Text style={styles.buttonText}>{loginLoading ? 'Memproses...' : 'Masuk'}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.containerBlock}>
              <Text style={styles.title}>Dashboard First-Mile</Text>
              <Text style={styles.bodyText}>Level: {userData.level}</Text>
              <Text style={styles.bodyText}>Zona Aktif: {userData.zone}</Text>
              <Text style={styles.bodyText}>Margin Subsidi Transport: {userData.subsidyMargin}</Text>
            </View>

            <View style={styles.containerBlock}>
              <Text style={styles.title}>Soft Booking Restock</Text>
              <TextInput
                style={styles.input}
                value={commodity}
                onChangeText={setCommodity}
                placeholder="Komoditas"
                placeholderTextColor={COLORS.text}
              />
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                placeholder="Jumlah"
                placeholderTextColor={COLORS.text}
              />
              <Pressable style={styles.button} onPress={handleSoftBooking}>
                <Text style={styles.buttonText}>Soft Booking</Text>
              </Pressable>
              <Text style={styles.bodyText}>{bookingMessage}</Text>
            </View>

            <View style={styles.containerBlock}>
              <Text style={styles.title}>Delivery Aktif</Text>
              <View style={styles.slaRow}>
                {[2, 4, 6].map((value) => {
                  const option = value as SlaOption;
                  const active = selectedSla === option;
                  return (
                    <Pressable
                      key={option}
                      style={[styles.slaButton, active && styles.slaButtonActive]}
                      onPress={() => setSelectedSla(option)}>
                      <Text style={[styles.slaButtonText, active && styles.slaButtonTextActive]}>{option} Jam</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={styles.button} onPress={handleStartDelivery}>
                <Text style={styles.buttonText}>Mulai Delivery SLA {selectedSla} Jam</Text>
              </Pressable>

              {delivery ? (
                <>
                  <Text style={styles.bodyText}>SLA Awal: {delivery.slaHours} Jam</Text>
                  <Text style={styles.bodyText}>Countdown: {formatDuration(deliveryRemainingMs)}</Text>
                  {canShowExtension && (
                    <Pressable style={styles.button} onPress={handleEmergencyExtension}>
                      <Text style={styles.buttonText}>Emergency Extension (+3 Jam)</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.buttonDanger} onPress={handleManualCancel}>
                    <Text style={styles.buttonText}>Manual Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={styles.bodyText}>Belum ada delivery aktif.</Text>
              )}

              {cooldownRemainingMs > 0 && (
                <Text style={styles.errorText}>Cooldown cancel: {formatDuration(cooldownRemainingMs)}</Text>
              )}
              {!!operationError && <Text style={styles.errorText}>{operationError}</Text>}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const baseText = {
  color: COLORS.text,
  fontFamily: 'JetBrainsMono_400Regular',
} as const;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageContent: {
    padding: 24,
    gap: 20,
  },
  containerBlock: {
    borderWidth: 1,
    borderColor: COLORS.text,
    borderRadius: 0,
    padding: 24,
    gap: 14,
    backgroundColor: COLORS.background,
  },
  title: {
    ...baseText,
    fontSize: 18,
    fontWeight: '700',
  },
  bodyText: {
    ...baseText,
    fontSize: 14,
  },
  input: {
    ...baseText,
    borderWidth: 1,
    borderColor: COLORS.text,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    borderWidth: 1,
    borderColor: COLORS.text,
    borderRadius: 4,
    backgroundColor: COLORS.active,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDanger: {
    borderWidth: 1,
    borderColor: COLORS.text,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    ...baseText,
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    ...baseText,
    color: COLORS.error,
    fontSize: 14,
  },
  slaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slaButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.text,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  slaButtonActive: {
    backgroundColor: COLORS.active,
  },
  slaButtonText: {
    ...baseText,
    fontSize: 13,
  },
  slaButtonTextActive: {
    color: COLORS.background,
  },
});
