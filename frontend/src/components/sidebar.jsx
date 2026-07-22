'use client'

import { type Module } from '@/lib/types'

interface SidebarProps {
  activeModule: Module
  onModuleChange: (m: Module) => void
}

const navItems: { id: Module; label: string; icon: string; sublabel?: string }[] = [
  { id: 'overview',      label: 'Vue d\'ensemble',       icon: 'dashboard' },
  { id: 'sinistralite',  label: 'Sinistralité',           icon: 'analytics',       sublabel: 'Module 1' },
  { id: 'provisionnement', label: 'Provisionnement',      icon: 'account_balance',  sublabel: 'Module 2' },
  { id: 'modelisation',  label: 'Modélisation',           icon: 'model_training',   sublabel: 'Module 3' },
  { id: 'series',        label: 'Séries temporelles',     icon: 'timeline',         sublabel: 'Module 4' },
  { id: 'reporting',     label: 'Reporting',              icon: 'summarize',        sublabel: 'Module 5' },
  { id: 'assistant',     label: 'Assistant IA',           icon: 'smart_toy',        sublabel: 'Module 6' },
]

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  return (
    <aside className="actuwise-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <md-icon>shield</md-icon>
        </div>
        <div>
          <div className="md-typescale-title-large sidebar-logo-name">ACTUWISE</div>
          <div className="md-typescale-label-small sidebar-logo-sub">Assurance BIAT</div>
        </div>
      </div>

      <md-divider />

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Modules principaux">
        {navItems.map((item) => {
          const active = item.id === activeModule
          return (
            <button
              key={item.id}
              className={`sidebar-nav-item${active ? ' active' : ''}`}
              onClick={() => onModuleChange(item.id)}
              aria-current={active ? 'page' : undefined}
            >
              <md-icon className="sidebar-nav-icon">{item.icon}</md-icon>
              <span className="sidebar-nav-content">
                {item.sublabel && (
                  <span className="md-typescale-label-small sidebar-nav-sublabel">{item.sublabel}</span>
                )}
                <span className="md-typescale-label-large sidebar-nav-label">{item.label}</span>
              </span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <md-divider />
        <div className="sidebar-footer-content">
          <md-icon>info</md-icon>
          <span className="md-typescale-label-small sidebar-footer-text">v2.1 — Données 2018-2023</span>
        </div>
      </div>
    </aside>
  )
}
