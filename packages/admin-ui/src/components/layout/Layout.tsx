/**
 * SYLON Admin UI - App Layout
 * Main application layout with sidebar navigation
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Truck,
  MapPin,
  Briefcase,
  Warehouse,
  Settings,
  Menu,
  X,
  Bell,
  User,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import './layout.css';

interface LayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onModuleChange: (module: string) => void;
}

// Field App URL - defaults to localhost:5174 for development
const FIELD_APP_URL = import.meta.env.VITE_FIELD_APP_URL || 'http://localhost:5174';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'works', label: 'Works', icon: Briefcase },
  { id: 'resources', label: 'Resurser', icon: Truck },
  { id: 'sites', label: 'Sites', icon: MapPin },
  { id: 'garage', label: 'Garage', icon: Warehouse },
];

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeModule,
  onModuleChange,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">S</div>
            {!sidebarCollapsed && <span className="logo-text">SYLON</span>}
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeModule === item.id ? 'nav-item-active' : ''}`}
                onClick={() => {
                  onModuleChange(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item">
            <Settings size={20} />
            {!sidebarCollapsed && <span>Inställningar</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main content */}
      <div className="main-wrapper">
        {/* Header */}
        <header className="header">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <div className="header-title">
            <h1>{navItems.find(i => i.id === activeModule)?.label ?? 'SYLON'}</h1>
          </div>

          <div className="header-actions">
            <a 
              href={FIELD_APP_URL}
              target="_blank" 
              rel="noopener noreferrer"
              className="header-btn field-app-link"
              title="Open Field App"
            >
              <Smartphone size={20} />
              <span className="field-app-text">Field App</span>
              <ExternalLink size={14} />
            </a>
            <button className="header-btn">
              <Bell size={20} />
              <span className="notification-badge">3</span>
            </button>
            <button className="header-btn user-btn">
              <User size={20} />
              <span className="user-name">Admin</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
