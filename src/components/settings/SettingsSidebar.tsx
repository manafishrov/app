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
  useSidebar,
} from '@manafishrov/ui/sidebar';
import { useLocation } from '@tanstack/solid-router';
import { type Component, type ComponentProps } from 'solid-js';
import ArrowBackIcon from '~icons/material-symbols/arrow-back';
import BugReportIcon from '~icons/material-symbols/bug-report';
import BuildIcon from '~icons/material-symbols/build';
import Drone2Icon from '~icons/material-symbols/drone-2';
import ExploreIcon from '~icons/material-symbols/explore';
import KeyboardIcon from '~icons/material-symbols/keyboard';
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
    label: () => m.settings_application_connection(),
    ariaLabel: () => m.aria_labels_connection_button(),
    to: '/settings/connection',
    Icon: SettingsEthernetIcon,
  },
];

const ROV_ITEMS: SidebarItem[] = [
  {
    label: () => m.settings_rov_general_rov(),
    ariaLabel: () => m.aria_labels_general_rov_button(),
    to: '/settings/general',
    Icon: Drone2Icon,
  },
  {
    label: () => m.settings_rov_calibration(),
    ariaLabel: () => m.aria_labels_calibration_button(),
    to: '/settings/calibration',
    Icon: BuildIcon,
  },
  {
    label: () => m.settings_rov_regulator(),
    ariaLabel: () => m.aria_labels_regulator_button(),
    to: '/settings/regulator',
    Icon: ExploreIcon,
  },
  {
    label: () => m.settings_rov_power(),
    ariaLabel: () => m.aria_labels_power_button(),
    to: '/settings/power',
    Icon: SpeedIcon,
  },
];

const normalizePath = (path: string): string =>
  path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path;

const joinClasses = (...classes: Array<string | undefined>): string =>
  classes.filter((className) => Boolean(className)).join(' ');

type SidebarLinkItemProps = {
  item: SidebarItem;
  isActive: (path: string) => boolean;
  showTooltip: boolean;
  disabledClass?: string;
};

type SettingsSidebarProps = {
  isFullscreen?: boolean;
};

const SidebarLinkItem: Component<SidebarLinkItemProps> = (props) => {
  const tooltipProps: { tooltip: string } | Record<string, never> = props.showTooltip
    ? { tooltip: props.item.label() }
    : {};

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        {...tooltipProps}
        aria-label={props.item.ariaLabel()}
        isActive={props.isActive(props.item.to)}
        asChild={(triggerProps) => {
          const buttonProps = triggerProps();
          const Icon = props.item.Icon;
          return (
            <Link
              {...buttonProps}
              to={props.item.to}
              activeOptions={{ exact: true }}
              class={joinClasses(buttonProps.class, props.disabledClass)}
            >
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
  const { isMobile, state } = useSidebar();

  const isConnected = (): boolean => connectionStatusStore.isConnected;
  const isActive = (path: string): boolean =>
    normalizePath(location().pathname) === normalizePath(path);
  const showTooltip = (): boolean => state() === 'collapsed' && !isMobile();
  const rovDisabledClass = (): string => (isConnected() ? '' : 'pointer-events-none opacity-50');

  return (
    <Sidebar
      collapsible='icon'
      style={{ '--sidebar-width': '10rem' }}
      disableMobileSidebar
      {...(!local.isFullscreen ? { innerClass: 'rounded-bl-2xl' } : {})}
    >
      <SidebarHeader {...(local.isFullscreen ? { class: 'mt-6' } : {})}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              {...(showTooltip() ? { tooltip: m.common_back() } : {})}
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
                <SidebarLinkItem item={item} isActive={isActive} showTooltip={showTooltip()} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{m.settings_rov_title()}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ROV_ITEMS.map((item) => (
                <SidebarLinkItem
                  item={item}
                  isActive={isActive}
                  showTooltip={showTooltip()}
                  disabledClass={rovDisabledClass()}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              {...(showTooltip() ? { tooltip: m.settings_debug_title() } : {})}
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
