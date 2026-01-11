import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  MapPin,
  Package,
  ScrollText,
  ChevronDown,
  ChevronRight,
  Users,
  Leaf,
  Recycle,
  Tractor,
  Sprout,
  Hammer,
  Calendar,
  Plus,
  Wrench
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const assetItems = [
  { title: 'Plant', url: '/records/assets/plants', icon: Sprout },
  { title: 'Animal', url: '/records/assets/animals', icon: Users },
  { title: 'Compost', url: '/records/assets/compost', icon: Recycle },
  { title: 'Equipment', url: '/records/assets/equipment', icon: Tractor },
];

const logItems = [
  { title: 'Harvest', url: '/records/logs/harvest', icon: Package },
  { title: 'Activity', url: '/records/logs/activity', icon: Hammer },
  { title: 'Input', url: '/records/logs/input', icon: Plus },
  { title: 'Maintenance', url: '/records/logs/maintenance', icon: Wrench },
  { title: 'Observation', url: '/records/logs/observation', icon: Calendar },
];

export function AppSidebar() {
  const { open, toggleSidebar } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const [assetsExpanded, setAssetsExpanded] = useState(currentPath.includes('/records/assets'));
  const [logsExpanded, setLogsExpanded] = useState(currentPath.includes('/records/logs'));

  const isActive = (path: string) => currentPath === path;
  const isParentActive = (basePath: string) => currentPath.startsWith(basePath);

  const getNavClasses = (active: boolean) => cn(
    "w-full justify-start",
    active ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
  );

  return (
    <Sidebar className={cn("border-r", !open ? "w-16" : "w-64")}>
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-semibold text-muted-foreground">
            {open && "Farm Management"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {/* Locations */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/locations" 
                    className={getNavClasses(isActive('/locations'))}
                  >
                    <MapPin className="h-4 w-4" />
                    {open && <span>Locations</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Assets */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setAssetsExpanded(!assetsExpanded)}
                  className={cn(
                    "w-full justify-between",
                    isParentActive('/records/assets') 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <Package className="h-4 w-4" />
                    {open && <span className="ml-2">Assets</span>}
                  </div>
                  {open && (
                    assetsExpanded ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronRight className="h-3 w-3" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Assets Submenu */}
              {assetsExpanded && open && (
                <div className="ml-4 space-y-1">
                  {assetItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className={getNavClasses(isActive(item.url))}
                        >
                          <item.icon className="h-3 w-3" />
                          <span className="ml-2 text-sm">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </div>
              )}

              {/* Logs */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLogsExpanded(!logsExpanded)}
                  className={cn(
                    "w-full justify-between",
                    isParentActive('/records/logs') 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <ScrollText className="h-4 w-4" />
                    {open && <span className="ml-2">Logs</span>}
                  </div>
                  {open && (
                    logsExpanded ? 
                      <ChevronDown className="h-3 w-3" /> : 
                      <ChevronRight className="h-3 w-3" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Logs Submenu */}
              {logsExpanded && open && (
                <div className="ml-4 space-y-1">
                  {logItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url}
                          className={getNavClasses(isActive(item.url))}
                        >
                          <item.icon className="h-3 w-3" />
                          <span className="ml-2 text-sm">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}