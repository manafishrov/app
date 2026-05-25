import type { Component, ComponentProps } from 'solid-js';

import { Link } from '@manafishrov/ui/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@manafishrov/ui/sidebar';
import { useLocation } from '@tanstack/solid-router';
import ArrowBackIcon from '~icons/material-symbols/arrow-back';
import BugReportIcon from '~icons/material-symbols/bug-report';
import BuildIcon from '~icons/material-symbols/build';
import Drone2Icon from '~icons/material-symbols/drone-2';
import ExploreIcon from '~icons/material-symbols/explore';
import KeyboardIcon from '~icons/material-symbols/keyboard';
import MemoryIcon from '~icons/material-symbols/memory';
import PaletteIcon from '~icons/material-symbols/palette';
import SdCardIcon from '~icons/material-symbols/sd-card';
import SettingsIcon from '~icons/material-symbols/settings';
import SettingsEthernetIcon from '~icons/material-symbols/settings-ethernet';
import SpeedIcon from '~icons/material-symbols/speed';
import SportsEsportsIcon from '~icons/material-symbols/sports-esports';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';

type SidebarItem = {
  label: () => string;
  ariaLabel: () => string;
  to: NonNullable<ComponentProps<typeof Link>['to']>;
  Icon: Component<ComponentProps<'svg'>>;
};

const APPLICATION_ITEMS = [
  {
    label: (): string => m.settings_application_general(),
    ariaLabel: (): string => m.aria_labels_general_button(),
    to: '/settings',
    Icon: SettingsIcon,
  },
  {
    label: (): string => m.settings_application_appearance(),
    ariaLabel: (): string => m.aria_labels_appearance_button(),
    to: '/settings/appearance',
    Icon: PaletteIcon,
  },
  {
    label: (): string => m.settings_application_keyboard(),
    ariaLabel: (): string => m.aria_labels_keyboard_button(),
    to: '/settings/keyboard',
    Icon: KeyboardIcon,
  },
  {
    label: (): string => m.settings_application_gamepad(),
    ariaLabel: (): string => m.aria_labels_gamepad_button(),
    to: '/settings/gamepad',
    Icon: SportsEsportsIcon,
  },
  {
    label: (): string => m.settings_application_app_connection(),
    ariaLabel: (): string => m.aria_labels_app_connection_button(),
    to: '/settings/app-connection',
    Icon: SettingsEthernetIcon,
  },
] as const satisfies readonly SidebarItem[];

const ROV_ITEMS = [
  {
    label: (): string => m.settings_rov_system(),
    ariaLabel: (): string => m.aria_labels_system_rov_button(),
    to: '/settings/rov/system',
    Icon: Drone2Icon,
  },
  {
    label: (): string => m.settings_rov_mcu(),
    ariaLabel: (): string => m.aria_labels_mcu_button(),
    to: '/settings/rov/mcu',
    Icon: MemoryIcon,
  },
  {
    label: (): string => m.settings_rov_calibration(),
    ariaLabel: (): string => m.aria_labels_calibration_button(),
    to: '/settings/rov/calibration',
    Icon: BuildIcon,
  },
  {
    label: (): string => m.settings_rov_regulator(),
    ariaLabel: (): string => m.aria_labels_regulator_button(),
    to: '/settings/rov/regulator',
    Icon: ExploreIcon,
  },
  {
    label: (): string => m.settings_rov_power(),
    ariaLabel: (): string => m.aria_labels_power_button(),
    to: '/settings/rov/power',
    Icon: SpeedIcon,
  },
  {
    label: (): string => m.settings_rov_connection(),
    ariaLabel: (): string => m.aria_labels_connection_rov_button(),
    to: '/settings/rov/connection',
    Icon: SettingsEthernetIcon,
  },
] as const satisfies readonly SidebarItem[];

const SLICE_LAST_CHAR = -1;

const normalizePath = (path: string): string =>
  path !== '/' && path.endsWith('/') ? path.slice(0, SLICE_LAST_CHAR) : path;

type SidebarLinkItemProps = {
  item: (typeof APPLICATION_ITEMS)[number] | (typeof ROV_ITEMS)[number];
  isActive: (path: string) => boolean;
};

type SettingsSidebarProps = {
  isFullscreen?: boolean | undefined;
};

const SidebarLinkItem: Component<SidebarLinkItemProps> = (props) => (
  <SidebarMenuItem>
    <SidebarMenuButton
      tooltip={props.item.label()}
      aria-label={props.item.ariaLabel()}
      isActive={props.isActive(props.item.to)}
      asChild={(triggerProps) => {
        const buttonProps = triggerProps();
        const { Icon } = props.item;
        return (
          <Link {...buttonProps} to={props.item.to} activeOptions={{ exact: true }}>
            <Icon aria-hidden='true' />
            <span>{props.item.label()}</span>
          </Link>
        );
      }}
    />
  </SidebarMenuItem>
);

const SettingsSidebarHeader: Component<{ isFullscreen?: boolean | undefined }> = (props) => (
  <SidebarHeader {...(props.isFullscreen === true ? { class: 'mt-6' } : {})}>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={m.common_back()}
          aria-label={m.aria_labels_back_button()}
          asChild={(triggerProps) => (
            <Link {...triggerProps()} to='/'>
              <ArrowBackIcon aria-hidden='true' />
              <span>{m.common_back()}</span>
            </Link>
          )}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarHeader>
);

const SettingsSidebarContent: Component<{
  isActive: (path: string) => boolean;
  isConnected: () => boolean;
}> = (props) => (
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>{m.settings_application_title()}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {APPLICATION_ITEMS.map((item) => (
            <SidebarLinkItem item={item} isActive={props.isActive} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>

    <Show when={props.isConnected()}>
      <SidebarGroup>
        <SidebarGroupLabel>{rovConfigStore.rovName}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {ROV_ITEMS.map((item) => (
              <SidebarLinkItem item={item} isActive={props.isActive} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </Show>
  </SidebarContent>
);

const SettingsSidebarFooter: Component<{ isActive: (path: string) => boolean }> = (props) => (
  <SidebarFooter>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={m.settings_sd_card_title()}
          aria-label={m.aria_labels_sd_card_button()}
          isActive={props.isActive('/settings/sd-card')}
          asChild={(triggerProps) => (
            <Link {...triggerProps()} to='/settings/sd-card' activeOptions={{ exact: true }}>
              <SdCardIcon aria-hidden='true' />
              <span>{m.settings_sd_card_title()}</span>
            </Link>
          )}
        />
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={m.settings_debug_title()}
          aria-label={m.aria_labels_debug_button()}
          isActive={props.isActive('/settings/debug')}
          asChild={(triggerProps) => (
            <Link {...triggerProps()} to='/settings/debug' activeOptions={{ exact: true }}>
              <BugReportIcon aria-hidden='true' />
              <span>{m.settings_debug_title()}</span>
            </Link>
          )}
        />
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarFooter>
);

const isConnected = (): boolean => connectionStatusStore.isConnected;

const SettingsSidebar: Component<SettingsSidebarProps> = (props) => {
  const [local] = splitProps(props, ['isFullscreen']);
  const location = useLocation();

  const isActive = (path: string): boolean =>
    normalizePath(location().pathname) === normalizePath(path);

  return (
    <Sidebar
      collapsible='icon'
      style={{ '--sidebar-width': '11rem' }}
      disableMobileSidebar
      {...(local.isFullscreen === true ? {} : { innerClass: 'rounded-bl-2xl' })}
    >
      <SettingsSidebarHeader isFullscreen={local.isFullscreen} />
      <SettingsSidebarContent isActive={isActive} isConnected={isConnected} />
      <SettingsSidebarFooter isActive={isActive} />
    </Sidebar>
  );
};

export { SettingsSidebar };
