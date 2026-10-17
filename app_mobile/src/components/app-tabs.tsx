import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '@/constants/colors';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={colors.white}
      indicatorColor={colors.background}
      labelStyle={{ selected: { color: colors.primary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* I18: "Meus pedidos" no lugar do Explore do template (ícone provisório). */}
      <NativeTabs.Trigger name="pedidos">
        <NativeTabs.Trigger.Label>Meus pedidos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
