import { createFileRoute } from '@tanstack/react-router';
import { Vision2026 } from '@/features/vision-2026/Vision2026';

export const Route = createFileRoute('/vision-2026')({
  head: () => ({ meta: [
    { title: 'SCD 2026/27 — Laboratorio visivo' },
    { name: 'description', content: 'Sei esperienze SCD in una preview interattiva di revisione. Staging senza dati reali o fonti private.' },
    { property: 'og:title', content: 'SCD 2026/27 — Visione del club' },
    { property: 'og:description', content: 'SCD Universe, Gestionale e Sponsor: visual staging da revisionare, non pubblicato.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Vision2026,
});