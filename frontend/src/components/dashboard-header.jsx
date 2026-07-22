'use client'

import { type Module } from '@/lib/types'
import { ThemeToggle } from '@/components/theme-toggle'

const moduleTitles: Record<Module, string> = {
  overview:        'Vue d\'ensemble',
  sinistralite:    'Module 1 — Analyse de la Sinistralité',
  provisionnement: 'Module 2 — Provisionnement des Réserves',
  modelisation:    'Module 3 — Modélisation des Risques',
  series:          'Module 4 — Séries Temporelles',
  reporting:       'Module 5 — Dashboard & Reporting',
  assistant:       'Module 6 — Assistant IA',
}

interface DashboardHeaderProps {
  activeModule: Module
  period: string
  onPeriodChange: (p: string) => void
  onMenuToggle: () => void
}

const periods = ['2018', '2019', '2020', '2021', '2022', '2023', '2018–2023']

export function DashboardHeader({ activeModule, period, onPeriodChange, onMenuToggle }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <md-icon-button className="header-menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
          <md-icon>menu</md-icon>
        </md-icon-button>
        <div>
          <div className="md-typescale-headline-small header-title">{moduleTitles[activeModule]}</div>
          <div className="md-typescale-label-medium header-subtitle">Assurance BIAT — Branche Automobile</div>
        </div>
      </div>
      <div className="header-right">
        <div className="header-period-select">
          <md-icon className="header-period-icon">calendar_month</md-icon>
          <select
            className="period-select"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            aria-label="Sélecteur de période"
          >
            {periods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <md-icon className="header-period-chevron">expand_more</md-icon>
        </div>
        <ThemeToggle />
        <div className="header-avatar" aria-label="Utilisateur">
          <md-icon>person</md-icon>
        </div>
      </div>
    </header>
  )
}
