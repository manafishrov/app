import { useMatches } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import {
  ArrowLeftIcon,
  BugIcon,
  CogIcon,
  CompassIcon,
  EthernetPortIcon,
  Gamepad2Icon,
  KeyboardIcon,
  WrenchIcon,
} from 'lucide-react';

import { Link } from '@/components/ui/Link';
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
} from '@/components/ui/Sidebar';

import { webSocketConnectionStore } from '@/stores/webSocketConnectionStore';

function SettingsSidebar() {
  const matches = useMatches();
  const webSocketConnection = useStore(webSocketConnectionStore);
  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuButton asChild aria-label='Back' tooltip='Back'>
            <Link to='/'>
              <ArrowLeftIcon />
              <span>Back</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  aria-label='General'
                  tooltip='General'
                  isActive={matches.some((match) => match.id === '/settings/')}
                >
                  <Link to='/settings'>
                    <CogIcon />
                    <span>General</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton
                  asChild
                  aria-label='Keyboard'
                  tooltip='Keyboard'
                  isActive={matches.some(
                    (match) => match.id === '/settings/keyboard/',
                  )}
                >
                  <Link to='/settings/keyboard'>
                    <KeyboardIcon />
                    <span>Keyboard</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton
                  asChild
                  aria-label='Gamepad'
                  tooltip='Gamepad'
                  isActive={matches.some(
                    (match) => match.id === '/settings/gamepad/',
                  )}
                >
                  <Link to='/settings/gamepad'>
                    <Gamepad2Icon />
                    <span>Gamepad</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton
                  asChild
                  aria-label='Connection'
                  tooltip='Connection'
                  isActive={matches.some(
                    (match) => match.id === '/settings/connection/',
                  )}
                >
                  <Link to='/settings/connection'>
                    <EthernetPortIcon />
                    <span>Connection</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Drone</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  aria-label='Calibration'
                  tooltip='Calibration'
                  isActive={matches.some(
                    (match) => match.id === '/settings/calibration/',
                  )}
                  disabled={!webSocketConnection.isConnected}
                >
                  <Link to='/settings/calibration'>
                    <WrenchIcon />
                    <span>Calibration</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton
                  asChild
                  aria-label='Regulator'
                  tooltip='Regulator'
                  isActive={matches.some(
                    (match) => match.id === '/settings/regulator/',
                  )}
                  disabled={!webSocketConnection.isConnected}
                >
                  <Link to='/settings/regulator'>
                    <CompassIcon />
                    <span>Regulator</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuButton
            asChild
            aria-label='Debug'
            tooltip='Debug'
            isActive={matches.some((match) => match.id === '/settings/debug/')}
          >
            <Link to='/settings/debug'>
              <BugIcon />
              <span>Debug</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export { SettingsSidebar };
