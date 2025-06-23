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

function SettingsSidebar() {
  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuButton asChild>
            <Link to='/' aria-label='Back' title='Back'>
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
                <SidebarMenuButton asChild>
                  <Link to='/settings' aria-label='Settings' title='Settings'>
                    <CogIcon />
                    <span>General</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton asChild>
                  <Link
                    to='/settings/keyboard'
                    aria-label='Keyboard'
                    title='Keyboard'
                  >
                    <KeyboardIcon />
                    <span>Keyboard</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton asChild>
                  <Link
                    to='/settings/gamepad'
                    aria-label='Gamepad'
                    title='Gamepad'
                  >
                    <Gamepad2Icon />
                    <span>Gamepad</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton asChild>
                  <Link
                    to='/settings/connection'
                    aria-label='Connection'
                    title='Connection'
                  >
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
                <SidebarMenuButton asChild>
                  <Link
                    to='/settings/calibration'
                    aria-label='Calibration'
                    title='Calibration'
                  >
                    <WrenchIcon />
                    <span>Calibration</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton asChild>
                  <Link
                    to='/settings/regulator'
                    aria-label='Regulator'
                    title='Regulator'
                  >
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
          <SidebarMenuButton asChild aria-label='Debug' title='Debug'>
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
