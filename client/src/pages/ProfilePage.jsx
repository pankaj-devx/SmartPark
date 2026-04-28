import { AccountSettingsPanel } from '../features/profile/AccountSettingsPanel.jsx';

export function ProfilePage({ defaultTab = 'profile', embedded = false, showHeader = true }) {
  return <AccountSettingsPanel defaultTab={defaultTab} embedded={embedded} showHeader={showHeader} />;
}
