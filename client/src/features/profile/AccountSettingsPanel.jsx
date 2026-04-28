import { useMemo, useState } from 'react';
import { BadgeCheck, Bell, Building2, Camera, KeyRound, Mail, Monitor, Moon, Phone, ShieldCheck, SunMedium, TriangleAlert, UserRound } from 'lucide-react';
import { getApiErrorMessage } from '../../lib/getApiErrorMessage.js';
import { useAuth } from '../auth/useAuth.js';
import { useTheme } from '../theme/useTheme.js';
import { updateMyPassword, updateMyProfile } from './profileApi.js';
import { buildProfilePayload, getInitialProfileForm, validateProfileForm, validateProfileImageFile } from './profileUtils.js';

export function AccountSettingsPanel({ defaultTab = 'profile', showHeader = true }) {
  const { updateUser, user } = useAuth();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [profileForm, setProfileForm] = useState(() => getInitialProfileForm(user));
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabs = useMemo(() => buildTabs(user?.role), [user?.role]);
  const roleSummary = useMemo(() => getRoleSummary(user?.role), [user?.role]);

  function updateProfileField(path, value) {
    setProfileForm((current) => setNestedValue(current, path, value));
  }

  function handleArrayChange(section, index, field, value) {
    setProfileForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: current[section][field].map((item, itemIndex) => (itemIndex === index ? { ...item, [value.name]: value.value } : item))
      }
    }));
  }

  function addRow(section, field, row) {
    setProfileForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: [...current[section][field], row]
      }
    }));
  }

  function removeRow(section, field, index) {
    setProfileForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: current[section][field].filter((_, itemIndex) => itemIndex !== index)
      }
    }));
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    const validationMessage = validateProfileForm(profileForm);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setIsSavingProfile(true);

    try {
      const updatedUser = await updateMyProfile(buildProfilePayload(profileForm, user?.role));
      updateUser(updatedUser);
      setProfileForm(getInitialProfileForm(updatedUser));
      setSuccess('Account settings saved');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Unable to save account settings'));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSave(event) {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation must match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordError('Choose a new password that is different from the current one');
      return;
    }

    setIsSavingPassword(true);

    try {
      await updateMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Password updated');
    } catch (apiError) {
      setPasswordError(getApiErrorMessage(apiError, 'Unable to update password'));
    } finally {
      setIsSavingPassword(false);
    }
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    const validationMessage = validateProfileImageFile(file);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError('');

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateProfileField('profilePhotoUrl', reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="grid gap-6">
      {showHeader ? (
        <div className="app-panel">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative">
                {profileForm.profilePhotoUrl ? (
                  <img alt={user?.name} className="h-20 w-20 rounded-2xl object-cover" src={profileForm.profilePhotoUrl} />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                    <UserRound className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-100">
                  <Camera className="h-4 w-4 text-slate-700" aria-hidden="true" />
                  <input accept="image/*" className="sr-only" onChange={handlePhotoChange} type="file" />
                </label>
              </div>
              <div>
                <p className="text-sm font-medium uppercase text-brand-700">Account experience</p>
                <h1 className="app-heading mt-2 text-3xl font-bold">{user?.name}</h1>
                <p className="app-copy mt-2 max-w-2xl text-sm leading-6">{roleSummary.description}</p>
              </div>
            </div>
            <div className="app-card-muted grid gap-2 text-sm">
              <SummaryPill icon={Mail} label={maskEmail(user?.email)} />
              <SummaryPill icon={Phone} label={maskPhone(user?.phone) || 'Phone not added'} />
              <SummaryPill icon={BadgeCheck} label={`Status: ${user?.status}`} />
            </div>
          </div>
        </div>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={`app-tab ${activeTab === tab.id ? 'app-tab-active' : ''}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p> : null}

      <form className="grid gap-6" onSubmit={handleProfileSave}>
        {activeTab === 'profile' ? (
          <SettingsCard title="Profile details" subtitle="Keep your primary account identity up to date.">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Full name" name="name" onChange={(event) => updateProfileField('name', event.target.value)} value={profileForm.name} />
              <TextField label="Email" name="email" onChange={(event) => updateProfileField('email', event.target.value)} type="email" value={profileForm.email} />
              <TextField label="Phone" name="phone" onChange={(event) => updateProfileField('phone', event.target.value)} value={profileForm.phone} />
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Role</p>
                <p className="mt-2 font-semibold capitalize text-slate-950">{user?.role}</p>
              </div>
            </div>
          </SettingsCard>
        ) : null}

        {activeTab === 'preferences' ? (
          <SettingsCard title="Preferences" subtitle="Shape notifications, density, and the visual experience you use every day.">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-3 md:grid-cols-2">
              <ToggleField checked={profileForm.preferences.emailNotifications} label="Email notifications" onChange={(checked) => updateProfileField('preferences.emailNotifications', checked)} />
              <ToggleField checked={profileForm.preferences.smsNotifications} label="SMS notifications" onChange={(checked) => updateProfileField('preferences.smsNotifications', checked)} />
              <ToggleField checked={profileForm.preferences.marketingEmails} label="Marketing emails" onChange={(checked) => updateProfileField('preferences.marketingEmails', checked)} />
              <ToggleField checked={profileForm.preferences.compactMode} label="Compact settings layout" onChange={(checked) => updateProfileField('preferences.compactMode', checked)} />
              </div>
              <div className="app-card-muted">
                <p className="app-heading text-sm font-semibold">Appearance</p>
                <p className="app-copy mt-2 text-sm leading-6">Choose a theme that fits your environment. SmartPark remembers the preference on this device.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <ThemeOptionButton currentTheme={theme} icon={SunMedium} label="Light" onClick={() => setTheme('light')} option="light" />
                  <ThemeOptionButton currentTheme={theme} icon={Moon} label="Dark" onClick={() => setTheme('dark')} option="dark" />
                  <ThemeOptionButton currentTheme={theme} icon={Monitor} label="System" onClick={() => setTheme('system')} option="system" />
                </div>
                <p className="app-copy-soft mt-3 text-xs">Active appearance: {resolvedTheme}</p>
              </div>
            </div>
          </SettingsCard>
        ) : null}

        {activeTab === 'role' && user?.role === 'driver' ? (
          <>
            <SettingsCard title="Vehicle details" subtitle="Store the vehicles you use most often for faster booking.">
              <div className="grid gap-4">
                {profileForm.driverProfile.vehicleDetails.map((vehicle, index) => (
                  <div className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-4" key={`vehicle-${index}`}>
                    <TextField label="Label" name="label" onChange={(event) => handleArrayChange('driverProfile', index, 'vehicleDetails', event.target)} value={vehicle.label} />
                    <TextField label="Registration" name="registrationNumber" onChange={(event) => handleArrayChange('driverProfile', index, 'vehicleDetails', event.target)} value={vehicle.registrationNumber} />
                    <SelectField
                      label="Vehicle type"
                      name="vehicleType"
                      onChange={(event) => handleArrayChange('driverProfile', index, 'vehicleDetails', event.target)}
                      options={[
                        { label: '2-wheeler', value: '2-wheeler' },
                        { label: '4-wheeler', value: '4-wheeler' }
                      ]}
                      value={vehicle.vehicleType}
                    />
                    <div className="flex items-end gap-2">
                      <TextField label="Color" name="color" onChange={(event) => handleArrayChange('driverProfile', index, 'vehicleDetails', event.target)} value={vehicle.color} />
                      {profileForm.driverProfile.vehicleDetails.length > 1 ? (
                        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => removeRow('driverProfile', 'vehicleDetails', index)} type="button">
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                <button className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => addRow('driverProfile', 'vehicleDetails', { label: '', registrationNumber: '', vehicleType: '4-wheeler', color: '' })} type="button">
                  Add vehicle
                </button>
              </div>
            </SettingsCard>

            <SettingsCard title="Saved addresses" subtitle="Keep frequent pickup or destination references close by.">
              <div className="grid gap-4">
                {profileForm.driverProfile.savedAddresses.map((address, index) => (
                  <div className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[180px_minmax(0,1fr)_auto]" key={`address-${index}`}>
                    <TextField label="Label" name="label" onChange={(event) => handleArrayChange('driverProfile', index, 'savedAddresses', event.target)} value={address.label} />
                    <TextField label="Address" name="address" onChange={(event) => handleArrayChange('driverProfile', index, 'savedAddresses', event.target)} value={address.address} />
                    <div className="flex items-end">
                      {profileForm.driverProfile.savedAddresses.length > 1 ? (
                        <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => removeRow('driverProfile', 'savedAddresses', index)} type="button">
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                <button className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={() => addRow('driverProfile', 'savedAddresses', { label: '', address: '' })} type="button">
                  Add address
                </button>
              </div>
            </SettingsCard>

            <SettingsCard title="Parking and privacy defaults" subtitle="Shape search, reminders, and privacy behavior for your account.">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Default vehicle type"
                  name="vehicleType"
                  onChange={(event) => updateProfileField('driverProfile.preferredParking.vehicleType', event.target.value)}
                  options={[
                    { label: '2-wheeler', value: '2-wheeler' },
                    { label: '4-wheeler', value: '4-wheeler' }
                  ]}
                  value={profileForm.driverProfile.preferredParking.vehicleType}
                />
                <TextField
                  label="Max hourly price"
                  min="0"
                  name="maxHourlyPrice"
                  onChange={(event) => updateProfileField('driverProfile.preferredParking.maxHourlyPrice', event.target.value)}
                  type="number"
                  value={profileForm.driverProfile.preferredParking.maxHourlyPrice}
                />
                <ToggleField checked={profileForm.driverProfile.preferredParking.coveredOnly} label="Prefer covered parking" onChange={(checked) => updateProfileField('driverProfile.preferredParking.coveredOnly', checked)} />
                <ToggleField checked={profileForm.driverProfile.preferredParking.evPreferred} label="Prefer EV-friendly parking" onChange={(checked) => updateProfileField('driverProfile.preferredParking.evPreferred', checked)} />
              </div>
            </SettingsCard>
          </>
        ) : null}

        {activeTab === 'role' && user?.role === 'owner' ? (
          <SettingsCard title="Business information" subtitle="Keep owner-facing operational and support details current.">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Business name" name="businessName" onChange={(event) => updateProfileField('ownerProfile.businessName', event.target.value)} value={profileForm.ownerProfile.businessName} />
              <TextField label="Business type" name="businessType" onChange={(event) => updateProfileField('ownerProfile.businessType', event.target.value)} value={profileForm.ownerProfile.businessType} />
              <TextField label="Tax ID" name="taxId" onChange={(event) => updateProfileField('ownerProfile.taxId', event.target.value)} value={profileForm.ownerProfile.taxId} />
              <TextField label="Support email" name="supportEmail" onChange={(event) => updateProfileField('ownerProfile.supportEmail', event.target.value)} type="email" value={profileForm.ownerProfile.supportEmail} />
              <TextField label="Support phone" name="supportPhone" onChange={(event) => updateProfileField('ownerProfile.supportPhone', event.target.value)} value={profileForm.ownerProfile.supportPhone} />
            </div>
          </SettingsCard>
        ) : null}

        {activeTab === 'role' && user?.role === 'admin' ? (
          <>
            <SettingsCard title="Admin settings" subtitle="Tune how you prefer to receive operational updates.">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Notification channel"
                  name="notificationChannel"
                  onChange={(event) => updateProfileField('adminProfile.notificationChannel', event.target.value)}
                  options={[
                    { label: 'Email', value: 'email' },
                    { label: 'Slack', value: 'slack' },
                    { label: 'SMS', value: 'sms' }
                  ]}
                  value={profileForm.adminProfile.notificationChannel}
                />
                <TextAreaField label="Admin notes" name="notes" onChange={(event) => updateProfileField('adminProfile.notes', event.target.value)} value={profileForm.adminProfile.notes} />
              </div>
            </SettingsCard>
            <SettingsCard title="Permissions summary" subtitle="A quick view of the workspace access currently granted to this admin account.">
              <div className="grid gap-3 md:grid-cols-3">
                <PermissionCard icon={ShieldCheck} label="Moderation access" value="Listings and booking oversight" />
                <PermissionCard icon={Building2} label="Platform control" value="Approval and reporting surfaces" />
                <PermissionCard icon={UserRound} label="Account scope" value="Admin-only workspace routes" />
              </div>
            </SettingsCard>
          </>
        ) : null}

        {activeTab === 'support' ? (
          <SettingsCard title="Support and account care" subtitle="Know where account help, reminders, and security guidance live before you need them.">
            <div className="grid gap-4 md:grid-cols-2">
              <SupportCard icon={Bell} label="Booking reminders" text="Notification preferences are managed in account settings, so reminders can stay aligned with your booking activity." />
              <SupportCard icon={TriangleAlert} label="Report an issue" text="Use support contact details on your account when you need help with reservations, listing issues, or payments." />
              <SupportCard icon={ShieldCheck} label="Security review" text="Review password freshness, privacy choices, and communication settings from the security and preferences tabs." />
              <SupportCard icon={Mail} label="Help and support" text="Keep your email and phone current so platform follow-up can reach the right person quickly." />
            </div>
          </SettingsCard>
        ) : null}

        {activeTab !== 'security' ? (
          <div className="flex justify-end">
            <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60" disabled={isSavingProfile} type="submit">
              {isSavingProfile ? 'Saving...' : 'Save account settings'}
            </button>
          </div>
        ) : null}
      </form>

      {activeTab === 'security' ? (
        <form className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handlePasswordSave}>
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-slate-100 p-3 text-slate-700">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Password and security</h2>
              <p className="mt-2 text-sm text-slate-600">Update your password and keep your account ready for everyday use.</p>
            </div>
          </div>

          {passwordError ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{passwordError}</p> : null}
          {passwordSuccess ? <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{passwordSuccess}</p> : null}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <TextField autoComplete="current-password" label="Current password" name="currentPassword" onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} type="password" value={passwordForm.currentPassword} />
            <TextField autoComplete="new-password" label="New password" name="newPassword" onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} type="password" value={passwordForm.newPassword} />
            <TextField autoComplete="new-password" label="Confirm new password" name="confirmPassword" onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} type="password" value={passwordForm.confirmPassword} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <SecurityCard
              title="Session review"
              text="This account stays protected by password-based access today. Session management and device visibility will expand in a later security phase."
            />
            <SecurityCard
              title="Privacy defaults"
              text="Marketing and notification preferences are opt-in from account preferences, helping limit unnecessary communication by default."
            />
          </div>

          <div className="mt-6 flex justify-end">
            <button className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={isSavingPassword} style={{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }} type="submit">
              {isSavingPassword ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function SettingsCard({ children, subtitle, title }) {
  return (
    <section className="app-panel">
      <h2 className="app-heading text-xl font-semibold">{title}</h2>
      <p className="app-copy mt-2 text-sm">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function TextField({ label, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <input className="app-input" {...props} />
    </label>
  );
}

function TextAreaField({ label, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <textarea className="app-input min-h-28" {...props} />
    </label>
  );
}

function SelectField({ label, options, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <select className="app-input" {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({ checked, label, onChange }) {
  return (
    <label className="app-card flex items-center justify-between gap-4 text-sm font-medium" style={{ color: 'var(--app-text-muted)' }}>
      <span>{label}</span>
      <input checked={checked} className="h-4 w-4 accent-brand-600" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

function SummaryPill({ icon, label }) {
  const Icon = icon;
  return (
    <div className="inline-flex items-center gap-2">
      <Icon className="h-4 w-4" style={{ color: 'var(--app-text-soft)' }} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function PermissionCard({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="app-card">
      <div className="app-copy-soft inline-flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <p className="app-heading mt-3 font-semibold">{value}</p>
    </div>
  );
}

function SupportCard({ icon, label, text }) {
  const Icon = icon;
  return (
    <div className="app-card">
      <div className="app-heading inline-flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
        {label}
      </div>
      <p className="app-copy mt-2 text-sm leading-6">{text}</p>
    </div>
  );
}

function SecurityCard({ text, title }) {
  return (
    <div className="app-card-muted">
      <p className="app-heading font-semibold">{title}</p>
      <p className="app-copy mt-2 text-sm leading-6">{text}</p>
    </div>
  );
}

function ThemeOptionButton({ currentTheme, icon, label, onClick, option }) {
  const Icon = icon;

  return (
    <button
      className={`app-tab justify-center ${currentTheme === option ? 'app-tab-active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function buildTabs(role) {
  const baseTabs = [
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'preferences', label: 'Preferences', icon: Bell },
    { id: 'security', label: 'Security', icon: KeyRound },
    { id: 'support', label: 'Support', icon: TriangleAlert }
  ];

  return [
    baseTabs[0],
    baseTabs[1],
    { id: 'role', label: role === 'owner' ? 'Business' : role === 'admin' ? 'Admin' : 'Driver', icon: role === 'owner' ? Building2 : ShieldCheck },
    baseTabs[2],
    baseTabs[3]
  ];
}

function getRoleSummary(role) {
  if (role === 'owner') {
    return {
      description: 'Maintain your owner identity, business details, support contacts, and operating preferences from one workspace.'
    };
  }

  if (role === 'admin') {
    return {
      description: 'Review your admin profile, operational preferences, and permissions context in a cleaner control-panel experience.'
    };
  }

  return {
    description: 'Keep your identity, vehicles, saved places, appearance, and privacy preferences aligned with how you actually park.'
  };
}

function setNestedValue(target, path, value) {
  const keys = path.split('.');
  const clone = structuredClone(target);
  let current = clone;

  for (let index = 0; index < keys.length - 1; index += 1) {
    current = current[keys[index]];
  }

  current[keys.at(-1)] = value;
  return clone;
}

function maskEmail(email) {
  if (!email || !email.includes('@')) {
    return email ?? '';
  }

  const [name, domain] = email.split('@');
  const safeName = name.length <= 2 ? `${name[0] ?? ''}*` : `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}`;
  return `${safeName}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) {
    return '';
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length < 4) {
    return phone;
  }

  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
