import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, Text, View, StyleSheet } from 'react-native';

import { colors } from '@/constants/colors';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="pedidos" href="/pedidos" asChild>
            <TabButton>Meus pedidos</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButtonView, isFocused && styles.tabButtonViewFocused]}>
        <Text style={[styles.tabButtonText, isFocused && styles.tabButtonTextFocused]}>
          {children}
        </Text>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <Text style={styles.brandText}>WashAway</Text>

        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: 8,
    paddingHorizontal: 32,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: 8,
    maxWidth: 800,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brandText: {
    marginRight: 'auto',
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  tabButtonViewFocused: {
    backgroundColor: colors.background,
  },
  tabButtonText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: colors.neutralGray,
  },
  tabButtonTextFocused: {
    color: colors.primary,
  },
});
