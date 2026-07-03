import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAppContext } from '@/hooks/useAppContext';
import { adService } from '@/services/adService';
import { useAdManager } from '@/hooks/useAdManager';

type QRType = 'text' | 'url' | 'wifi' | 'phone' | 'sms' | 'email' | 'contact' | 'location' | 'upi';

interface QRTypeConfig {
  id: QRType;
  label: string;
  icon: string;
  color: string;
  placeholder: string;
}

const QR_TYPES: QRTypeConfig[] = [
  { id: 'text', label: 'Text', icon: 'text-fields', color: '#6B7280', placeholder: 'Enter your text...' },
  { id: 'url', label: 'URL', icon: 'link', color: '#3B82F6', placeholder: 'https://example.com' },
  { id: 'wifi', label: 'WiFi', icon: 'wifi', color: '#22C55E', placeholder: 'Network name (SSID)' },
  { id: 'phone', label: 'Phone', icon: 'call', color: '#10B981', placeholder: '+1234567890' },
  { id: 'sms', label: 'SMS', icon: 'sms', color: '#F59E0B', placeholder: '+1234567890' },
  { id: 'email', label: 'Email', icon: 'email', color: '#EF4444', placeholder: 'user@example.com' },
  { id: 'contact', label: 'Contact', icon: 'contact-page', color: '#8B5CF6', placeholder: 'Full Name' },
  { id: 'location', label: 'Location', icon: 'location-on', color: '#EC4899', placeholder: 'Latitude (e.g. 28.6139)' },
  { id: 'upi', label: 'UPI', icon: 'payment', color: '#F97316', placeholder: 'UPI ID (user@bank)' },
];

interface WifiFields { ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass' }
interface ContactFields { name: string; phone: string; email: string; org: string }
interface LocationFields { lat: string; lng: string }
interface UPIFields { upiId: string; name: string; amount: string }
interface SMSFields { phone: string; message: string }
interface EmailFields { to: string; subject: string; body: string }

function buildQRContent(
  type: QRType,
  mainValue: string,
  wifi: WifiFields,
  contact: ContactFields,
  location: LocationFields,
  upi: UPIFields,
  sms: SMSFields,
  emailFields: EmailFields
): string {
  switch (type) {
    case 'text':
      return mainValue;
    case 'url':
      return mainValue.startsWith('http') ? mainValue : `https://${mainValue}`;
    case 'phone':
      return `tel:${mainValue}`;
    case 'wifi':
      return `WIFI:T:${wifi.security};S:${wifi.ssid};P:${wifi.password};;`;
    case 'sms':
      return `smsto:${sms.phone}:${sms.message}`;
    case 'email':
      return `mailto:${emailFields.to}?subject=${encodeURIComponent(emailFields.subject)}&body=${encodeURIComponent(emailFields.body)}`;
    case 'contact':
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${contact.name}`,
        contact.phone ? `TEL:${contact.phone}` : '',
        contact.email ? `EMAIL:${contact.email}` : '',
        contact.org ? `ORG:${contact.org}` : '',
        'END:VCARD',
      ].filter(Boolean).join('\n');
    case 'location':
      return `geo:${location.lat},${location.lng}`;
    case 'upi':
      return `upi://pay?pa=${upi.upiId}&pn=${encodeURIComponent(upi.name)}&am=${upi.amount}&cu=INR`;
    default:
      return mainValue;
  }
}

function validateContent(type: QRType, mainValue: string, wifi: WifiFields, contact: ContactFields, location: LocationFields, upi: UPIFields, sms: SMSFields, emailFields: EmailFields): string | null {
  switch (type) {
    case 'text':
      if (!mainValue.trim()) return 'Please enter some text.';
      break;
    case 'url':
      if (!mainValue.trim()) return 'Please enter a URL.';
      break;
    case 'phone':
      if (!mainValue.trim()) return 'Please enter a phone number.';
      break;
    case 'wifi':
      if (!wifi.ssid.trim()) return 'Please enter the network name (SSID).';
      break;
    case 'sms':
      if (!sms.phone.trim()) return 'Please enter a phone number.';
      break;
    case 'email':
      if (!emailFields.to.trim()) return 'Please enter an email address.';
      break;
    case 'contact':
      if (!contact.name.trim()) return 'Please enter a contact name.';
      break;
    case 'location':
      if (!location.lat.trim() || !location.lng.trim()) return 'Please enter both latitude and longitude.';
      break;
    case 'upi':
      if (!upi.upiId.trim()) return 'Please enter a UPI ID.';
      if (!upi.name.trim()) return 'Please enter the payee name.';
      break;
  }
  return null;
}

export default function GeneratorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addHistoryItem } = useAppContext();
  const { showInterstitial } = useAdManager();

  const [selectedType, setSelectedType] = useState<QRType>('url');
  const [mainValue, setMainValue] = useState('');
  const [wifi, setWifi] = useState<WifiFields>({ ssid: '', password: '', security: 'WPA' });
  const [contact, setContact] = useState<ContactFields>({ name: '', phone: '', email: '', org: '' });
  const [location, setLocation] = useState<LocationFields>({ lat: '', lng: '' });
  const [upi, setUpi] = useState<UPIFields>({ upiId: '', name: '', amount: '' });
  const [sms, setSms] = useState<SMSFields>({ phone: '', message: '' });
  const [emailFields, setEmailFields] = useState<EmailFields>({ to: '', subject: '', body: '' });
  const [generating, setGenerating] = useState(false);

  const typeConfig = QR_TYPES.find(t => t.id === selectedType)!;

  const handleTypeSelect = useCallback((type: QRType) => {
    setSelectedType(type);
    setMainValue('');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (generating) return;

    // Validate first
    const validationError = validateContent(selectedType, mainValue, wifi, contact, location, upi, sms, emailFields);
    if (validationError) {
      Alert.alert('Missing Info', validationError);
      return;
    }

    // Build content with the current selectedType
    const content = buildQRContent(selectedType, mainValue, wifi, contact, location, upi, sms, emailFields);

    if (!content.trim()) {
      Alert.alert('Missing Info', 'Please fill in the required fields.');
      return;
    }

    setGenerating(true);
    try {
      const item = await addHistoryItem({
        type: 'generated',
        content,
        qrType: selectedType,
        label: mainValue.trim() || content.slice(0, 50),
      });

      const count = await adService.incrementGenerateCount();
      if (count % 5 === 0) showInterstitial();

      router.push(`/qr-detail?id=${item.id}`);
    } catch {
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [generating, selectedType, mainValue, wifi, contact, location, upi, sms, emailFields, addHistoryItem, router, showInterstitial]);

  const renderFields = () => {
    switch (selectedType) {
      case 'wifi':
        return (
          <View style={styles.fieldsGroup}>
            <TextInput
              style={styles.input}
              placeholder="Network Name (SSID) *"
              placeholderTextColor={Colors.textTertiary}
              value={wifi.ssid}
              onChangeText={v => setWifi(p => ({ ...p, ssid: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textTertiary}
              value={wifi.password}
              onChangeText={v => setWifi(p => ({ ...p, password: v }))}
              secureTextEntry
            />
            <View style={styles.securityRow}>
              {(['WPA', 'WEP', 'nopass'] as const).map(s => (
                <Pressable
                  key={s}
                  style={[styles.secChip, wifi.security === s && styles.secChipActive]}
                  onPress={() => setWifi(p => ({ ...p, security: s }))}
                >
                  <Text style={[styles.secChipText, wifi.security === s && styles.secChipTextActive]}>
                    {s === 'nopass' ? 'No Password' : s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      case 'sms':
        return (
          <View style={styles.fieldsGroup}>
            <TextInput
              style={styles.input}
              placeholder="Phone Number *"
              placeholderTextColor={Colors.textTertiary}
              value={sms.phone}
              onChangeText={v => setSms(p => ({ ...p, phone: v }))}
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.input, styles.multiInput]}
              placeholder="Message"
              placeholderTextColor={Colors.textTertiary}
              value={sms.message}
              onChangeText={v => setSms(p => ({ ...p, message: v }))}
              multiline
              numberOfLines={3}
            />
          </View>
        );
      case 'email':
        return (
          <View style={styles.fieldsGroup}>
            <TextInput
              style={styles.input}
              placeholder="To (email address) *"
              placeholderTextColor={Colors.textTertiary}
              value={emailFields.to}
              onChangeText={v => setEmailFields(p => ({ ...p, to: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Subject"
              placeholderTextColor={Colors.textTertiary}
              value={emailFields.subject}
              onChangeText={v => setEmailFields(p => ({ ...p, subject: v }))}
            />
            <TextInput
              style={[styles.input, styles.multiInput]}
              placeholder="Body"
              placeholderTextColor={Colors.textTertiary}
              value={emailFields.body}
              onChangeText={v => setEmailFields(p => ({ ...p, body: v }))}
              multiline
              numberOfLines={3}
            />
          </View>
        );
      case 'contact':
        return (
          <View style={styles.fieldsGroup}>
            <TextInput
              style={styles.input}
              placeholder="Full Name *"
              placeholderTextColor={Colors.textTertiary}
              value={contact.name}
              onChangeText={v => setContact(p => ({ ...p, name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor={Colors.textTertiary}
              value={contact.phone}
              onChangeText={v => setContact(p => ({ ...p, phone: v }))}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={Colors.textTertiary}
              value={contact.email}
              onChangeText={v => setContact(p => ({ ...p, email: v }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Organization"
              placeholderTextColor={Colors.textTertiary}
              value={contact.org}
              onChangeText={v => setContact(p => ({ ...p, org: v }))}
            />
          </View>
        );
      case 'location':
        return (
          <View style={styles.fieldsGroup}>
            <TextInput
              style={styles.input}
              placeholder="Latitude (e.g. 28.6139) *"
              placeholderTextColor={Colors.textTertiary}
              value={location.lat}
              onChangeText={v => setLocation(p => ({ ...p, lat: v }))}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Longitude (e.g. 77.2090) *"
              placeholderTextColor={Colors.textTertiary}
              value={location.lng}
              onChangeText={v => setLocation(p => ({ ...p, lng: v }))}
              keyboardType="decimal-pad"
            />
          </View>
        );
      case 'upi':
        return (
          <View style={styles.fieldsGroup}>
            <TextInput
              style={styles.input}
              placeholder="UPI ID (e.g. user@bank) *"
              placeholderTextColor={Colors.textTertiary}
              value={upi.upiId}
              onChangeText={v => setUpi(p => ({ ...p, upiId: v }))}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Payee Name *"
              placeholderTextColor={Colors.textTertiary}
              value={upi.name}
              onChangeText={v => setUpi(p => ({ ...p, name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Amount (optional)"
              placeholderTextColor={Colors.textTertiary}
              value={upi.amount}
              onChangeText={v => setUpi(p => ({ ...p, amount: v }))}
              keyboardType="decimal-pad"
            />
          </View>
        );
      default:
        return (
          <TextInput
            style={[styles.input, selectedType === 'text' && styles.multiInput]}
            placeholder={typeConfig.placeholder}
            placeholderTextColor={Colors.textTertiary}
            value={mainValue}
            onChangeText={setMainValue}
            multiline={selectedType === 'text'}
            numberOfLines={selectedType === 'text' ? 4 : 1}
            keyboardType={selectedType === 'phone' ? 'phone-pad' : 'default'}
            autoCapitalize={selectedType === 'url' ? 'none' : 'sentences'}
            autoCorrect={selectedType !== 'url'}
          />
        );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={styles.headerTitle}>QR Generator</Text>
        <Text style={styles.headerSub}>Create custom QR codes</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Selector */}
        <Text style={styles.sectionLabel}>Select Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeRow}
        >
          {QR_TYPES.map(t => (
            <Pressable
              key={t.id}
              style={[
                styles.typeChip,
                selectedType === t.id && { backgroundColor: t.color, borderColor: t.color },
              ]}
              onPress={() => handleTypeSelect(t.id)}
            >
              <MaterialIcons
                name={t.icon as any}
                size={18}
                color={selectedType === t.id ? Colors.white : t.color}
              />
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === t.id && styles.typeChipTextActive,
                ]}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Form */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={[styles.formIconWrap, { backgroundColor: typeConfig.color + '18' }]}>
              <MaterialIcons name={typeConfig.icon as any} size={22} color={typeConfig.color} />
            </View>
            <View>
              <Text style={styles.formTitle}>{typeConfig.label} QR Code</Text>
              <Text style={styles.formSub}>Fill in the details below</Text>
            </View>
          </View>
          {renderFields()}
        </View>

        {/* Generate Button */}
        <Pressable
          style={({ pressed }) => [
            styles.generateBtn,
            (pressed || generating) && styles.generateBtnPressed,
          ]}
          onPress={handleGenerate}
          disabled={generating}
        >
          <MaterialIcons name="qr-code" size={22} color={Colors.white} />
          <Text style={styles.generateBtnText}>
            {generating ? 'Generating...' : 'Generate QR Code'}
          </Text>
        </Pressable>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: Spacing.base,
  },
  sectionLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.base,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  typeChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.white,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.md,
    gap: Spacing.base,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  formIconWrap: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  formSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fieldsGroup: {
    gap: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minHeight: 52,
  },
  multiInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  securityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  secChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  secChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  secChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: Typography.weights.semibold,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.base,
    minHeight: 56,
    ...Shadows.green,
  },
  generateBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  generateBtnText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
