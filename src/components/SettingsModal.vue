<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { appRuntimeConfig } from "@/config/runtime";

const props = defineProps({
  messenger: { type: Object, required: true }
});

const draftName = ref(props.messenger.state.username || "");
const draftDescription = ref(props.messenger.state.profile?.description || "");
const draftPronouns = ref(props.messenger.state.profile?.pronouns || "");
const fileInputRef = ref(null);
const avatarInputRef = ref(null);
const bannerInputRef = ref(null);
const firstInputRef = ref(null);
const activeSection = ref("profile");
const mobileSectionOpen = ref(false);
const settingsSearch = ref("");
const isMobileSettings = ref(false);

const isOpen = computed(() => props.messenger.state.settingsOpen);

const nameChanged = computed(() => draftName.value.trim() !== String(props.messenger.state.username || "").trim());
const nameValid = computed(() => !props.messenger.validateUsername(draftName.value));
const meAccent = computed(() => props.messenger.accentFor(props.messenger.state.username || "you"));
const meInitials = computed(() => initialsOf(props.messenger.state.username));
const profile = computed(() => props.messenger.myProfile.value);
const avatarSrc = computed(() => props.messenger.profileImageSrc(profile.value.avatar));
const bannerSrc = computed(() => props.messenger.profileImageSrc(profile.value.banner));
const profileTextChanged = computed(() =>
  draftDescription.value.trim() !== String(profile.value.description || "").trim()
  || draftPronouns.value.trim() !== String(profile.value.pronouns || "").trim()
);

const allSections = [
  { id: "profile", label: "Profile" },
  { id: "ui", label: "UI & Appearance" },
  { id: "security", label: "Security" },
  { id: "privacy", label: "Privacy" },
  { id: "notifications", label: "Notifications" },
  { id: "calls", label: "Calls" },
  { id: "advanced", label: "Advanced" },
  { id: "admin", label: "Admin" },
  { id: "backups", label: "Backups" },
  { id: "about", label: "About" }
];
const sections = computed(() => allSections.filter((section) => section.id !== "admin" || props.messenger.state.admin));
const filteredSections = computed(() => {
  const query = settingsSearch.value.trim().toLowerCase();
  if (!query) return sections.value;
  return sections.value.filter((section) => section.label.toLowerCase().includes(query));
});
const activeSectionLabel = computed(() => sections.value.find((section) => section.id === activeSection.value)?.label || "Settings");

watch(isOpen, async (v) => {
  if (v) {
    mobileSectionOpen.value = false;
    settingsSearch.value = "";
    draftName.value = props.messenger.state.username || "";
    draftDescription.value = props.messenger.state.profile?.description || "";
    draftPronouns.value = props.messenger.state.profile?.pronouns || "";
    props.messenger.refreshAudioDevices();
    await nextTick();
    if (!isMobileSettings.value && activeSection.value === "profile") {
      firstInputRef.value?.focus();
      firstInputRef.value?.select();
    }
  }
});

watch(activeSection, async (section) => {
  if (!isOpen.value) return;
  if (section === "calls") props.messenger.refreshAudioDevices();
  if (section === "admin") props.messenger.loadAdminOverview();
  if (section !== "calls") props.messenger.stopMicTest();
  if (section === "profile") {
    await nextTick();
    firstInputRef.value?.focus();
  }
});

function close() {
  props.messenger.stopMicTest();
  mobileSectionOpen.value = false;
  props.messenger.state.settingsOpen = false;
}

function selectSection(sectionId: string) {
  activeSection.value = sectionId;
  if (isMobileSettings.value) mobileSectionOpen.value = true;
}

function backToSettingsList() {
  props.messenger.stopMicTest();
  mobileSectionOpen.value = false;
}

async function saveName() {
  if (!nameValid.value || !nameChanged.value) return;
  await props.messenger.changeUsername(draftName.value.trim());
  draftName.value = props.messenger.state.username || "";
}

function saveProfileText() {
  if (!profileTextChanged.value) return;
  props.messenger.setProfileText({
    description: draftDescription.value,
    pronouns: draftPronouns.value
  });
}

function onAvatarPicked(event) {
  const file = event.target.files?.[0];
  if (file) props.messenger.setProfileImageFromFile("avatar", file);
  event.target.value = "";
}

function onBannerPicked(event) {
  const file = event.target.files?.[0];
  if (file) props.messenger.setProfileImageFromFile("banner", file);
  event.target.value = "";
}

function onExport() { props.messenger.exportData(); }
function onImport() { fileInputRef.value?.click(); }
function onFilePicked(event) {
  const file = event.target.files?.[0];
  if (file) props.messenger.importData(file);
  event.target.value = "";
}
function onClear() {
  if (!confirm("Clear all local data? This removes every conversation, message, and reaction from this browser. The remote server is not touched.")) return;
  props.messenger.clearAllData();
  close();
}

function onLogout() {
  props.messenger.logoutAccount();
  close();
}

function targetChecked(event: Event) {
  return Boolean((event.target as HTMLInputElement | null)?.checked);
}

function targetValue(event: Event) {
  return (event.target as HTMLInputElement | HTMLSelectElement | null)?.value || "";
}

const microphones = computed(() =>
  props.messenger.state.audioDevices.filter((device) => device.kind === "audioinput")
);
const headphones = computed(() =>
  props.messenger.state.audioDevices.filter((device) => device.kind === "audiooutput")
);

const runtimePlatform = computed(() => {
  const messengerPlatform = String(props.messenger.platformsForUser?.(props.messenger.state.username || "")?.[0] || "").trim();
  if (messengerPlatform) return messengerPlatform;
  const ua = String(navigator.userAgent || "").toLowerCase();
  if (ua.includes("android")) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (ua.includes("windows")) return "windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macos";
  if (ua.includes("linux")) return "linux";
  return "web";
});

const runtimeDetails = computed(() => {
  const uaData = (navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } }).userAgentData;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  return {
    appVersion: __APP_VERSION__,
    platform: props.messenger.platformLabel(runtimePlatform.value),
    os: uaData?.platform || navigator.platform || "unknown",
    mobile: uaData?.mobile ?? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    secureContext: window.isSecureContext,
    online: navigator.onLine,
    language: navigator.language || "unknown",
    timezone,
    userAgent: navigator.userAgent,
    serverOrigin: appRuntimeConfig.serverOrigin,
    apiBaseUrl: appRuntimeConfig.apiBaseUrl,
    wsUrl: appRuntimeConfig.wsUrl
  };
});

function deviceLabel(device, fallback) {
  return device.label || fallback;
}

function initialsOf(name) {
  const trimmed = String(name || "?").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/[\s\-_]+/).slice(0, 2);
  if (parts.length === 2 && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

function onKey(event) {
  if (!isOpen.value) return;
  if (event.key !== "Escape") return;
  if (isMobileSettings.value && mobileSectionOpen.value) backToSettingsList();
  else close();
}

function syncMobileSettings() {
  isMobileSettings.value = window.matchMedia("(max-width: 820px)").matches;
}

onMounted(() => {
  syncMobileSettings();
  window.addEventListener("resize", syncMobileSettings, { passive: true });
  document.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", syncMobileSettings);
  document.removeEventListener("keydown", onKey);
});
</script>

<template>
  <div v-if="isOpen" class="settings" :class="{ 'settings--section-open': mobileSectionOpen }" role="dialog"
    aria-modal="true" aria-labelledby="settings-title">
    <aside class="settings__side">
      <header class="settings__side-head">
        <h2 id="settings-title">Settings</h2>
        <button class="icon-btn settings__close" type="button" aria-label="Close settings" @click="close">
          <svg viewBox="0 0 24 24">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <label class="settings__search">
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input v-model="settingsSearch" type="search" placeholder="Search" autocomplete="off" />
      </label>

      <button class="settings__card" type="button" @click="activeSection = 'profile'">
        <span v-if="avatarSrc" class="side-user__avatar">
          <img :src="avatarSrc" alt="" />
        </span>
        <span v-else class="avatar avatar--md" :class="`avatar--${meAccent}`">{{ meInitials }}</span>
        <span>
          <strong>{{ messenger.state.username || "anonymous" }}</strong>
          <small>{{ messenger.connectionLabel.value }}</small>
        </span>
      </button>

      <div class="settings__mobile-label">Account Settings</div>

      <nav class="settings__nav" aria-label="Settings sections">
        <button v-for="section in filteredSections" :key="section.id" type="button" class="settings__nav-item"
          :class="{ 'is-active': activeSection === section.id }" @click="selectSection(section.id)">
          <svg v-if="section.id === 'profile'" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
          <svg v-else-if="section.id === 'ui'" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8" />
            <path d="M12 16v4" />
          </svg>
          <svg v-else-if="section.id === 'security'" viewBox="0 0 24 24">
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            <path d="M12 14v2.5" />
          </svg>
          <svg v-else-if="section.id === 'privacy'" viewBox="0 0 24 24">
            <path d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z" />
            <path d="M9.5 12.5 11 14l3.5-4" />
          </svg>
          <svg v-else-if="section.id === 'notifications'" viewBox="0 0 24 24">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
            <path d="M10 21h4" />
          </svg>
          <svg v-else-if="section.id === 'calls'" viewBox="0 0 24 24">
            <path
              d="M7.6 10.8a14.5 14.5 0 0 0 5.6 5.6l1.9-1.9a1.5 1.5 0 0 1 1.5-.37c1.03.34 2.1.52 3.2.52.83 0 1.5.67 1.5 1.5v3.05c0 .83-.67 1.5-1.5 1.5C10.45 20.7 3.3 13.55 3.3 4.2c0-.83.67-1.5 1.5-1.5h3.05c.83 0 1.5.67 1.5 1.5 0 1.1.18 2.17.52 3.2.17.53.03 1.1-.37 1.5l-1.9 1.9Z" />
          </svg>
          <svg v-else-if="section.id === 'advanced'" viewBox="0 0 24 24">
            <path d="M4 7h5" />
            <path d="M15 7h5" />
            <circle cx="12" cy="7" r="3" />
            <path d="M4 17h8" />
            <path d="M18 17h2" />
            <circle cx="15" cy="17" r="3" />
            <path d="M12 10v4" />
          </svg>
          <svg v-else-if="section.id === 'admin'" viewBox="0 0 24 24">
            <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
            <path
              d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2 2 0 0 1-2.83 2.83l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 0 1-4 0v-.1a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05a2 2 0 0 1-2.83-2.83l.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.1H3a2 2 0 0 1 0-4h.1A1.8 1.8 0 0 0 4.75 8.8a1.8 1.8 0 0 0-.36-1.98l-.05-.05A2 2 0 0 1 7.17 3.94l.05.05a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 10.3 2.7V2.6a2 2 0 0 1 4 0v.1a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.05-.05a2 2 0 0 1 2.83 2.83l-.05.05a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.1h.1a2 2 0 0 1 0 4h-.1A1.8 1.8 0 0 0 19.4 15Z" />
          </svg>
          <svg v-else-if="section.id === 'backups'" viewBox="0 0 24 24">
            <path d="M12 3v12" />
            <path d="m6 9 6-6 6 6" />
            <path d="M5 21h14" />
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span>{{ section.label }}</span>
          <svg class="settings__chevron" viewBox="0 0 24 24">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </nav>
    </aside>

    <main class="settings__main">
      <header class="settings__main-head">
        <button class="icon-btn settings__back" type="button" aria-label="Back to settings" @click="backToSettingsList">
          <svg viewBox="0 0 24 24">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h3>{{ activeSectionLabel }}</h3>
      </header>

      <section v-if="activeSection === 'profile'" class="settings-page">
        <div class="settings-profile">
          <div class="settings-profile__banner" :class="{ 'has-image': bannerSrc }">
            <img v-if="bannerSrc" :src="bannerSrc" alt="" />
          </div>
          <span v-if="avatarSrc" class="settings-profile__avatar-image">
            <img :src="avatarSrc" alt="" />
          </span>
          <span v-else class="avatar settings-profile__avatar" :class="`avatar--${meAccent}`">{{ meInitials }}</span>
          <div class="settings-profile__actions">
            <button type="button" class="btn settings-profile__photo" @click="avatarInputRef?.click()">Profile
              image</button>
            <button type="button" class="btn settings-profile__photo" @click="bannerInputRef?.click()">Banner</button>
            <button v-if="profile.avatar" type="button" class="btn settings-profile__photo"
              @click="messenger.clearProfileImage('avatar')">Clear image</button>
            <button v-if="profile.banner" type="button" class="btn settings-profile__photo"
              @click="messenger.clearProfileImage('banner')">Clear banner</button>
          </div>
          <input ref="avatarInputRef" type="file" accept="image/png,image/apng,image/gif,image/jpeg,image/webp,.apng,.webp"
            style="display: none" @change="onAvatarPicked" />
          <input ref="bannerInputRef" type="file" accept="image/png,image/apng,image/gif,image/jpeg,image/webp,.apng,.webp"
            style="display: none" @change="onBannerPicked" />
        </div>

        <div class="settings-group">
          <label class="settings-field">
            <span class="settings-field__icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </span>
            <span class="settings-field__body">
              <span class="settings-field__label">Display name</span>
              <span class="settings-field__hint">Visible to people you message.</span>
            </span>
          </label>
          <div class="settings-inline">
            <input ref="firstInputRef" v-model="draftName" type="text" maxlength="32" autocomplete="off"
              spellcheck="false" placeholder="e.g. echo" class="settings-input" @keydown.enter.prevent="saveName" />
            <button type="button" class="btn btn--primary settings-btn" :disabled="!nameValid || !nameChanged"
              @click="saveName">Save</button>
          </div>
        </div>

        <div class="settings-group">
          <label class="settings-field">
            <span class="settings-field__icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="m4.93 4.93 2.83 2.83" />
                <path d="m16.24 16.24 2.83 2.83" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
                <path d="m4.93 19.07 2.83-2.83" />
                <path d="m16.24 7.76 2.83-2.83" />
              </svg>
            </span>
            <span class="settings-field__body">
              <span class="settings-field__label">Status</span>
              <span class="settings-field__hint">Controls how you appear in Presence.</span>
            </span>
          </label>
          <label class="settings-select settings-select--offset">
            <span class="sr-only">Status</span>
            <select :value="messenger.state.status" @change="messenger.setPresenceStatus(targetValue($event))">
              <option value="online">Online</option>
              <option value="invisible">Invisible</option>
              <option value="dnd">Do Not Disturb</option>
            </select>
          </label>
        </div>


        <div class="settings-group">
          <label class="settings-field">
            <span class="settings-field__icon">
              <svg viewBox="0 0 24 24">
                <path d="M4 6h16" />
                <path d="M4 12h13" />
                <path d="M4 18h9" />
              </svg>
            </span>
            <span class="settings-field__body">
              <span class="settings-field__label">Description</span>
              <span class="settings-field__hint">{{ draftDescription.length }}/{{ messenger.MAX_PROFILE_DESCRIPTION_LENGTH }}</span>
            </span>
          </label>
          <textarea v-model="draftDescription" class="settings-input settings-textarea"
            :maxlength="messenger.MAX_PROFILE_DESCRIPTION_LENGTH" spellcheck="true" rows="4"
            placeholder="Write a short profile description"></textarea>
        </div>

        <div class="settings-group">
          <label class="settings-field">
            <span class="settings-field__icon">
              <svg viewBox="0 0 24 24">
                <path d="M5 7h14" />
                <path d="M8 7v10" />
                <path d="M16 7v10" />
                <path d="M4 17h16" />
              </svg>
            </span>
            <span class="settings-field__body">
              <span class="settings-field__label">Pronouns</span>
              <span class="settings-field__hint">{{ draftPronouns.length }}/{{ messenger.MAX_PROFILE_PRONOUNS_LENGTH
                }}</span>
            </span>
          </label>
          <div class="settings-inline">
            <input v-model="draftPronouns" type="text" :maxlength="messenger.MAX_PROFILE_PRONOUNS_LENGTH"
              autocomplete="off" spellcheck="false" placeholder="e.g. they/them" class="settings-input"
              @keydown.enter.prevent="saveProfileText" />
            <button type="button" class="btn btn--primary settings-btn" :disabled="!profileTextChanged"
              @click="saveProfileText">Save</button>
          </div>
        </div>

        <p class="settings-note">
          Profile image max 2 MB. Banner max 5 MB, PNG/APNG/GIF/JPEG/WEBP.
        </p>
      </section>

      <section v-else-if="activeSection === 'ui'" class="settings-page">
        <div class="settings-group">
          <h4>Theme</h4>
          <label class="settings-select">
            <span>Application theme</span>
            <select :value="messenger.state.themeMode" @change="messenger.setThemeMode(targetValue($event))">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="adaptive">Adaptive (time based)</option>
            </select>
          </label>
          <p class="settings-note">Adaptive switches automatically based on your local time.</p>
        </div>

        <div class="settings-group">
          <h4>Colors</h4>
          <label class="settings-select">
            <span>Accent color</span>
            <select :value="messenger.state.appAccent" @change="messenger.setAppAccent(targetValue($event))">
              <option value="blue">Blue</option>
              <option value="violet">Violet</option>
              <option value="emerald">Emerald</option>
              <option value="rose">Rose</option>
              <option value="amber">Amber</option>
            </select>
          </label>
        </div>

        <div class="settings-group">
          <h4>Messages</h4>
          <label class="settings-select">
            <span>Message shape</span>
            <select :value="messenger.state.messageStyle" @change="messenger.setMessageStyle(targetValue($event))">
              <option value="bubble">Bubbles</option>
              <option value="discord">Discord-style (left line)</option>
            </select>
          </label>
        </div>
      </section>

      <section v-else-if="activeSection === 'security'" class="settings-page">
        <div class="settings-group">
          <h4>Account</h4>
          <dl class="settings-kv">
            <div>
              <dt>User ID</dt>
              <dd>{{ messenger.state.userId || "—" }}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{{ messenger.state.username || "—" }}</dd>
            </div>
          </dl>
          <div class="settings-actions">
            <button type="button" class="btn settings-btn" @click="messenger.downloadRecoveryWords">
              Download recovery words
            </button>
            <button type="button" class="btn settings-btn settings-btn--danger" @click="onLogout">
              Log out
            </button>
          </div>
          <p class="settings-note">
            Recovery words are shown only after account creation or recovery on this browser.
          </p>
        </div>
      </section>

      <section v-else-if="activeSection === 'privacy'" class="settings-page">
        <div class="settings-group">
          <h4>Privacy</h4>
          <label class="settings-check">
            <span>Delete local room messages when leaving</span>
            <input type="checkbox" :checked="messenger.state.deleteMessagesOnLeave"
              @change="messenger.setDeleteMessagesOnLeave(targetChecked($event))" />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
          <label class="settings-check">
            <span>Streamer mode</span>
            <input type="checkbox" :checked="messenger.state.streamerMode"
              @change="messenger.setStreamerMode(targetChecked($event))" />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
          <p class="settings-note">
            Streamer mode hides room IDs in the interface while keeping your rooms connected.
          </p>
        </div>
      </section>

      <section v-else-if="activeSection === 'notifications'" class="settings-page">
        <div class="settings-group">
          <h4>Messages</h4>
          <label class="settings-check">
            <span>Play a sound for new messages</span>
            <input type="checkbox" :checked="messenger.state.messageSoundEnabled"
              @change="messenger.setMessageSoundEnabled(targetChecked($event))" />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
          <label class="settings-check">
            <span>Show notifications for background messages</span>
            <input type="checkbox" :checked="messenger.state.androidNotificationsEnabled"
              @change="messenger.setAndroidNotificationsEnabled(targetChecked($event))" />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
          <p class="settings-note">Permission: {{ messenger.notificationPermission() }}</p>
        </div>

        <div class="settings-group">
          <h4>Sounds</h4>
          <div class="sound-list">
            <div class="sound-row">
              <div class="sound-row__info">
                <span class="sound-row__label">Message</span>
                <button type="button" class="sound-row__preview" @click="messenger.previewSound('message')">Preview Sound</button>
              </div>
              <label class="toggle" :class="{ 'is-on': messenger.state.soundFlags.message }">
                <input type="checkbox" :checked="messenger.state.soundFlags.message" @change="messenger.setSoundEnabled('message', targetChecked($event))" />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
              </label>
            </div>
            <div class="sound-row">
              <div class="sound-row__info">
                <span class="sound-row__label">Voice Connected</span>
                <button type="button" class="sound-row__preview" @click="messenger.previewSound('join')">Preview Sound</button>
              </div>
              <label class="toggle" :class="{ 'is-on': messenger.state.soundFlags.join }">
                <input type="checkbox" :checked="messenger.state.soundFlags.join" @change="messenger.setSoundEnabled('join', targetChecked($event))" />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
              </label>
            </div>
            <div class="sound-row">
              <div class="sound-row__info">
                <span class="sound-row__label">Voice Disconnected</span>
                <button type="button" class="sound-row__preview" @click="messenger.previewSound('leave')">Preview Sound</button>
              </div>
              <label class="toggle" :class="{ 'is-on': messenger.state.soundFlags.leave }">
                <input type="checkbox" :checked="messenger.state.soundFlags.leave" @change="messenger.setSoundEnabled('leave', targetChecked($event))" />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
              </label>
            </div>
            <div class="sound-row">
              <div class="sound-row__info">
                <span class="sound-row__label">Mute</span>
                <button type="button" class="sound-row__preview" @click="messenger.previewSound('mute')">Preview Sound</button>
              </div>
              <label class="toggle" :class="{ 'is-on': messenger.state.soundFlags.mute }">
                <input type="checkbox" :checked="messenger.state.soundFlags.mute" @change="messenger.setSoundEnabled('mute', targetChecked($event))" />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
              </label>
            </div>
            <div class="sound-row">
              <div class="sound-row__info">
                <span class="sound-row__label">Unmute</span>
                <button type="button" class="sound-row__preview" @click="messenger.previewSound('unmute')">Preview Sound</button>
              </div>
              <label class="toggle" :class="{ 'is-on': messenger.state.soundFlags.unmute }">
                <input type="checkbox" :checked="messenger.state.soundFlags.unmute" @change="messenger.setSoundEnabled('unmute', targetChecked($event))" />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
              </label>
            </div>
            <div class="sound-row">
              <div class="sound-row__info">
                <span class="sound-row__label">Camera On</span>
                <button type="button" class="sound-row__preview" @click="messenger.previewSound('cameraOn')">Preview Sound</button>
              </div>
              <label class="toggle" :class="{ 'is-on': messenger.state.soundFlags.cameraOn }">
                <input type="checkbox" :checked="messenger.state.soundFlags.cameraOn" @change="messenger.setSoundEnabled('cameraOn', targetChecked($event))" />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
              </label>
            </div>
            <div class="sound-row">
              <div class="sound-row__info">
                <span class="sound-row__label">Camera Off</span>
                <button type="button" class="sound-row__preview" @click="messenger.previewSound('cameraOff')">Preview Sound</button>
              </div>
              <label class="toggle" :class="{ 'is-on': messenger.state.soundFlags.cameraOff }">
                <input type="checkbox" :checked="messenger.state.soundFlags.cameraOff" @change="messenger.setSoundEnabled('cameraOff', targetChecked($event))" />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
              </label>
            </div>
            <div class="sound-row">
              <div class="sound-row__info">
                <span class="sound-row__label">Screen Share On</span>
                <button type="button" class="sound-row__preview" @click="messenger.previewSound('screenOn')">Preview Sound</button>
              </div>
              <label class="toggle" :class="{ 'is-on': messenger.state.soundFlags.screenOn }">
                <input type="checkbox" :checked="messenger.state.soundFlags.screenOn" @change="messenger.setSoundEnabled('screenOn', targetChecked($event))" />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
              </label>
            </div>
            <div class="sound-row">
              <div class="sound-row__info">
                <span class="sound-row__label">Screen Share Off</span>
                <button type="button" class="sound-row__preview" @click="messenger.previewSound('screenOff')">Preview Sound</button>
              </div>
              <label class="toggle" :class="{ 'is-on': messenger.state.soundFlags.screenOff }">
                <input type="checkbox" :checked="messenger.state.soundFlags.screenOff" @change="messenger.setSoundEnabled('screenOff', targetChecked($event))" />
                <span class="toggle__track"><span class="toggle__thumb"></span></span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="activeSection === 'calls'" class="settings-page">
        <div class="settings-group">
          <h4>Calling</h4>
          <label class="settings-check">
            <span>Enable incoming calls</span>
            <input type="checkbox" checked disabled />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
          <label class="settings-check">
            <span>Play calling sounds</span>
            <input type="checkbox" checked disabled />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
        </div>

        <div class="settings-group">
          <h4>Devices</h4>
          <label class="settings-select">
            <span>Microphone</span>
            <select :value="messenger.state.selectedAudioInputId"
              @change="messenger.setAudioInput(targetValue($event))">
              <option value="">System default</option>
              <option v-for="(device, index) in microphones" :key="device.deviceId || `mic-${index}`"
                :value="device.deviceId">
                {{ deviceLabel(device, `Microphone ${Number(index) + 1}`) }}
              </option>
            </select>
          </label>

          <label class="settings-select">
            <span>Speakers</span>
            <select :value="messenger.state.selectedAudioOutputId"
              @change="messenger.setAudioOutput(targetValue($event))">
              <option value="">System default</option>
              <option v-for="(device, index) in headphones" :key="device.deviceId || `speaker-${index}`"
                :value="device.deviceId">
                {{ deviceLabel(device, `Output ${Number(index) + 1}`) }}
              </option>
            </select>
          </label>

          <p class="settings-note" v-if="messenger.state.audioDevicesPermission !== 'granted'">
            Allow microphone access to reveal the real device names and available inputs/outputs. This does not start a
            call.
          </p>
          <button type="button" class="btn settings-btn" :disabled="messenger.state.audioDevicesLoading"
            @click="messenger.unlockAudioDevices">
            {{ messenger.state.audioDevicesLoading ? "Checking..." : "Allow and refresh devices" }}
          </button>
        </div>

        <div class="settings-group">
          <h4>Advanced</h4>
          <label class="settings-range">
            <span>Microphone noise threshold</span>
            <small>Raise it to avoid sending background noise.</small>
            <div class="settings-meter">
              <span class="settings-meter__bar" :style="{ width: `${messenger.state.micTestLevel}%` }"></span>
              <span class="settings-meter__threshold"
                :style="{ left: `${messenger.state.microphoneThreshold}%` }"></span>
            </div>
            <input type="range" min="0" max="100" step="1" :value="messenger.state.microphoneThreshold"
              @input="messenger.setMicrophoneThreshold(targetValue($event))" />
            <strong>{{ messenger.state.microphoneThreshold }}</strong>
          </label>
          <button type="button" class="btn settings-btn" :class="{ 'icon-btn--active': messenger.state.micTestActive }"
            :disabled="messenger.state.micTestLoading" @click="messenger.startMicTest">
            {{ messenger.state.micTestLoading ? "Starting..." : messenger.state.micTestActive ? "Stop listening" :
            "Listen and test mic" }}
          </button>
        </div>
      </section>

      <section v-else-if="activeSection === 'advanced'" class="settings-page">
        <div class="settings-group">
          <h4>Connection</h4>
          <label class="settings-check">
            <span>Reconnect automatically to chat</span>
            <input type="checkbox" :checked="messenger.state.autoReconnectEnabled"
              @change="messenger.setAutoReconnectEnabled(targetChecked($event))" />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
          <label class="settings-check">
            <span>Let the server clear local message cache</span>
            <input type="checkbox" :checked="messenger.state.serverClearsLocalMessages"
              @change="messenger.setServerClearsLocalMessages(targetChecked($event))" />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
          <p class="settings-note">
            Enabled by default. When disabled, reconnecting keeps Android/browser cached room messages even if the
            server history is empty after a protocol refresh.
          </p>
        </div>

        <div class="settings-group">
          <h4>Uploads</h4>
          <label class="settings-check">
            <span>Automatically archive files in .zip when upload</span>
            <input type="checkbox" :checked="messenger.state.autoArchiveUploads"
              @change="messenger.setAutoArchiveUploads(targetChecked($event))" />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
          <p class="settings-note">
            Disabled by default. When enabled, uploaded attachments are wrapped in a ZIP file before sending. Upload limit: 25 MB.
          </p>
        </div>
      </section>

      <section v-else-if="activeSection === 'admin'" class="settings-page">
        <div class="settings-group">
          <h4>Admin</h4>
          <button type="button" class="btn settings-btn" :disabled="messenger.state.adminLoading"
            @click="messenger.loadAdminOverview">
            {{ messenger.state.adminLoading ? "Loading..." : "Refresh" }}
          </button>
          <dl class="settings-kv" v-if="messenger.state.adminOverview">
            <div>
              <dt>Online</dt>
              <dd>{{ messenger.state.adminOverview.onlineCount }}</dd>
            </div>
            <div>
              <dt>Users</dt>
              <dd>{{ messenger.state.adminOverview.users?.length || 0 }}</dd>
            </div>
            <div>
              <dt>Rooms</dt>
              <dd>{{ messenger.state.adminOverview.rooms?.length || 0 }}</dd>
            </div>
          </dl>
        </div>

        <div class="settings-group" v-if="messenger.state.adminOverview?.features">
          <h4>Features</h4>
          <label class="settings-check">
            <span>Registrations</span>
            <input type="checkbox" :checked="messenger.state.adminOverview.features.registerEnabled"
              @change="messenger.setAdminFeature('registerEnabled', targetChecked($event))" />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
          <label class="settings-check">
            <span>Calls</span>
            <input type="checkbox" :checked="messenger.state.adminOverview.features.callsEnabled"
              @change="messenger.setAdminFeature('callsEnabled', targetChecked($event))" />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
        </div>

        <div class="settings-group" v-if="messenger.state.adminOverview?.users?.length">
          <h4>Users</h4>
          <div class="admin-list">
            <div v-for="user in messenger.state.adminOverview.users" :key="user.id" class="admin-row">
              <div>
                <strong>{{ user.username }}</strong>
                <small>
                  {{ user.id }}
                  <template v-if="user.admin"> · admin</template>
                  <template v-if="user.disabled"> · disabled</template>
                  <template v-else> · {{ messenger.presenceStatusLabel(user.status) }}</template>
                </small>
              </div>
              <button type="button" class="btn settings-btn" :class="{ 'settings-btn--danger': !user.disabled }"
                @click="messenger.setAdminUserDisabled(user.id, !user.disabled)">
                {{ user.disabled ? "Enable" : "Disable" }}
              </button>
            </div>
          </div>
        </div>

        <div class="settings-group" v-if="messenger.state.adminOverview?.rooms?.length">
          <h4>Rooms</h4>
          <div class="admin-list">
            <div v-for="room in messenger.state.adminOverview.rooms" :key="room.roomId" class="admin-row">
              <div>
                <strong>{{ messenger.displayRoomName(room.roomId) }}</strong>
                <small>
                  {{ room.messageCount }} messages · {{ room.onlineCount || 0 }} online · {{ room.voiceCount || 0 }}
                  voice
                  <template v-if="room.active"> · active</template>
                </small>
              </div>
            </div>
          </div>
          <p class="settings-note">Room previews expose metadata only, never message bodies.</p>
        </div>
      </section>

      <section v-else-if="activeSection === 'backups'" class="settings-page">
        <div class="settings-group">
          <h4>Backups</h4>
          <p class="settings-note">
            Backups include username, room list, message history metadata, reactions, and unread counts.
            Attachment bytes are dropped from persistent storage to keep files small.
          </p>
          <div class="settings-actions">
            <button type="button" class="btn settings-btn" @click="onExport">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v12" />
                <path d="m6 9 6-6 6 6" />
                <path d="M5 21h14" />
              </svg>
              Export JSON
            </button>
            <button type="button" class="btn settings-btn" @click="onImport">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 21V9" />
                <path d="m6 15 6 6 6-6" />
                <path d="M5 3h14" />
              </svg>
              Import JSON
            </button>
            <button type="button" class="btn settings-btn settings-btn--danger" @click="onClear">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="m5 6 1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
              </svg>
              Clear all
            </button>
          </div>
        </div>
        <input ref="fileInputRef" type="file" accept="application/json,.json" style="display: none"
          @change="onFilePicked" />
      </section>

      <section v-else class="settings-page">
        <div class="settings-group">
          <h4>About</h4>
          <dl class="settings-kv">
            <div>
              <dt>Session</dt>
              <dd>{{ messenger.state.uuid || "—" }}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{{ messenger.connectionLabel.value }}</dd>
            </div>
            <div>
              <dt>Joined rooms</dt>
              <dd>{{ messenger.state.joinedRooms.length }}</dd>
            </div>
            <div>
              <dt>Saved rooms</dt>
              <dd>{{ messenger.state.rooms.length }}</dd>
            </div>
          </dl>
        </div>

        <div class="settings-group">
          <h4>Developer details</h4>
          <dl class="settings-kv">
            <div>
              <dt>App version</dt>
              <dd>{{ runtimeDetails.appVersion }}</dd>
            </div>
            <div>
              <dt>Platform</dt>
              <dd>{{ runtimeDetails.platform }}</dd>
            </div>
            <div>
              <dt>Operating system</dt>
              <dd>{{ runtimeDetails.os }}</dd>
            </div>
            <div>
              <dt>Mobile runtime</dt>
              <dd>{{ runtimeDetails.mobile ? "yes" : "no" }}</dd>
            </div>
            <div>
              <dt>Secure context</dt>
              <dd>{{ runtimeDetails.secureContext ? "yes" : "no" }}</dd>
            </div>
            <div>
              <dt>Online</dt>
              <dd>{{ runtimeDetails.online ? "yes" : "no" }}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{{ runtimeDetails.language }}</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{{ runtimeDetails.timezone }}</dd>
            </div>
            <div>
              <dt>Server origin</dt>
              <dd>{{ runtimeDetails.serverOrigin }}</dd>
            </div>
            <div>
              <dt>API base URL</dt>
              <dd>{{ runtimeDetails.apiBaseUrl }}</dd>
            </div>
            <div>
              <dt>WebSocket URL</dt>
              <dd>{{ runtimeDetails.wsUrl }}</dd>
            </div>
            <div>
              <dt>User agent</dt>
              <dd>{{ runtimeDetails.userAgent }}</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  </div>
</template>
