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
import PaletteIcon from '~icons/material-symbols/palette';
import SettingsIcon from '~icons/material-symbols/settings';
import SettingsEthernetIcon from '~icons/material-symbols/settings-ethernet';
import SpeedIcon from '~icons/material-symbols/speed';
import SportsEsportsIcon from '~icons/material-symbols/sports-esports';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';

type SidebarItem = {
  label: () => string;
  ariaLabel: () => string;
  to: NonNullable<ComponentProps<typeof Link>['to']>;
  Icon: Component<ComponentProps<'svg'>>;
};

const APPLICATION_ITEMS: SidebarItem[] = [
  {
    label: () => m.settings_application_general(),
    ariaLabel: () => m.aria_labels_general_button(),
    to: '/settings',
    Icon: SettingsIcon,
  },
  {
    label: () => m.settings_application_appearence(),
    ariaLabel: () => m.aria_labels_appearence_button(),
    to: '/settings/appearence',
    Icon: PaletteIcon,
  },
  {
    label: () => m.settings_application_keyboard(),
    ariaLabel: () => m.aria_labels_keyboard_button(),
    to: '/settings/keyboard',
    Icon: KeyboardIcon,
  },
  {
    label: () => m.settings_application_gamepad(),
    ariaLabel: () => m.aria_labels_gamepad_button(),
    to: '/settings/gamepad',
    Icon: SportsEsportsIcon,
  },
  {
    label: () => m.settings_application_app_connection(),
    ariaLabel: () => m.aria_labels_app_connection_button(),
    to: '/settings/app-connection',
    Icon: SettingsEthernetIcon,
  },
];

const ROV_ITEMS: SidebarItem[] = [
  {
    label: () => m.settings_rov_system(),
    ariaLabel: () => m.aria_labels_system_rov_button(),
    to: '/settings/rov/system',
    Icon: Drone2Icon,
  },
  {
    label: () => m.settings_rov_calibration(),
    ariaLabel: () => m.aria_labels_calibration_button(),
    to: '/settings/rov/calibration',
    Icon: BuildIcon,
  },
  {
    label: () => m.settings_rov_regulator(),
    ariaLabel: () => m.aria_labels_regulator_button(),
    to: '/settings/rov/regulator',
    Icon: ExploreIcon,
  },
  {
    label: () => m.settings_rov_power(),
    ariaLabel: () => m.aria_labels_power_button(),
    to: '/settings/rov/power',
    Icon: SpeedIcon,
  },
];

const normalizePath = (path: string): string =>
  path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path;

type SidebarLinkItemProps = {
  item: SidebarItem;
  isActive: (path: string) => boolean;
  disabled?: boolean;
};

type SettingsSidebarProps = {
  isFullscreen?: boolean;
};

const SidebarLinkItem: Component<SidebarLinkItemProps> = (props) => {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={props.item.label()}
        aria-label={props.item.ariaLabel()}
        isActive={props.isActive(props.item.to)}
        disabled={props.disabled}
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
};

const SettingsSidebar: Component<SettingsSidebarProps> = (props) => {
  const [local] = splitProps(props, ['isFullscreen']);
  const location = useLocation();

  const isConnected = (): boolean => connectionStatusStore.isConnected;
  const isActive = (path: string): boolean =>
    normalizePath(location().pathname) === normalizePath(path);

  return (
    <Sidebar
      collapsible='icon'
      style={{ '--sidebar-width': '11rem' }}
      disableMobileSidebar
      {...(!local.isFullscreen ? { innerClass: 'rounded-bl-2xl' } : {})}
    >
      <SidebarHeader {...(local.isFullscreen ? { class: 'mt-6' } : {})}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={m.common_back()}
              aria-label={m.aria_labels_back_button()}
              asChild={(props) => (
                <Link {...props()} to='/'>
                  <ArrowBackIcon aria-hidden='true' />
                  <span>{m.common_back()}</span>
                </Link>
              )}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{m.settings_application_title()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {APPLICATION_ITEMS.map((item) => (
                <SidebarLinkItem item={item} isActive={isActive} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{m.settings_rov_title()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ROV_ITEMS.map((item) => (
                <SidebarLinkItem item={item} isActive={isActive} disabled={!isConnected()} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={m.settings_debug_title()}
              aria-label={m.aria_labels_debug_button()}
              isActive={isActive('/settings/debug')}
              asChild={(props) => (
                <Link {...props()} to='/settings/debug' activeOptions={{ exact: true }}>
                  <BugReportIcon aria-hidden='true' />
                  <span>{m.settings_debug_title()}</span>
                </Link>
              )}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export { SettingsSidebar };
