import { LeakDocument } from "@/lib/types";

export const LEAK_DOCUMENTS: LeakDocument[] = [
  {
    id: "glider-x2-rcs-v42",
    title:
      "Hypersonic Glide Vehicle - Radar Cross Section (RCS) and Plasma Sheath Interaction (Project GLIDER-X2, Version 4.2)",
    date: "2026-04-18",
    classification: "Top Secret",
    format: "pdf",
    isSimulation: true,
    preview:
      "Project GLIDER-X2 Version 4.2 dossier covering radar cross section behavior and plasma sheath interaction observations.",
    content:
      "Project GLIDER-X2 V4.2 PDF dossier. Use download to retrieve the full source file.",
    downloadFileName: "project-glider-x2-v4-2.pdf",
    assetPath: "/leaks/project-glider-x2-v4-2.pdf",
  },
  {
    id: "archive-000",
    title: "Archive Integrity Notice",
    date: "2026-04-18",
    classification: "Confidential",
    format: "markdown",
    isSimulation: true,
    preview:
      "Restricted archive package indexed for wallet-gated research access and controlled review workflows.",
    content: `# ARCHIVE INTEGRITY NOTICE\n\nThis vault package is structured for controlled review workflows.\n\n- Entity names are anonymized\n- Sensitive identifiers are masked\n- Materials are presented as archive-style records\n\nUse this index to navigate dossiers, media exhibits, and briefings inside the portal.`,
    downloadFileName: "archive-integrity-notice.md",
  },
  {
    id: "hpc-dir-tree",
    title: "HPC Directory Tree Snapshot",
    date: "2026-04-18",
    classification: "Top Secret",
    format: "image",
    isSimulation: true,
    preview:
      "Workstation directory inventory screenshot mapped to resource-node naming patterns.",
    content: `# HPC DIRECTORY TREE SNAPSHOT\n\nEvidence image illustrating endpoint directory listing patterns during incident triage.\n\n[[REDACTED]] host labels remain masked in this publication copy.`,
    media: [
      {
        path: "/leaks/evidence-hpc-tree.svg",
        caption: "Desktop/file-tree capture",
      },
    ],
    downloadFileName: "hpc-directory-tree.md",
  },
  {
    id: "ldap-export",
    title: "Directory Service Export Fragment",
    date: "2026-04-18",
    classification: "Redacted",
    format: "image",
    isSimulation: true,
    preview:
      "LDIF-style extract showing user/group structures and masked credential fields.",
    content: `# DIRECTORY EXPORT FRAGMENT\n\nRedacted directory export format used in archive review playbooks.\n\nStrings resembling credentials are masked placeholders.`,
    media: [
      {
        path: "/leaks/evidence-ldap-fragment.svg",
        caption: "Directory export screenshot",
      },
    ],
    downloadFileName: "directory-export-fragment.md",
  },
  {
    id: "scheduler-console",
    title: "Resource Scheduler Panel",
    date: "2026-04-17",
    classification: "Confidential",
    format: "image",
    isSimulation: true,
    preview:
      "Scheduler console view with resource search, queue status, and user allocation card.",
    content: `# RESOURCE SCHEDULER PANEL\n\nControl-plane view used for operational workflow reconstruction.\n\nPanel metadata is anonymized in this release.`,
    media: [
      {
        path: "/leaks/evidence-scheduler-panel.svg",
        caption: "Resource console screenshot",
      },
    ],
    downloadFileName: "resource-scheduler-panel.md",
  },
  {
    id: "ingress-map",
    title: "Ingress Route Heatmap",
    date: "2026-04-17",
    classification: "Top Secret",
    format: "markdown",
    isSimulation: true,
    preview:
      "Ingress map shows segmented access routes, queue spikes, and mirrored subnets.",
    content: `# INGRESS ROUTE HEATMAP\n\n## Summary\nTraffic modeling indicates activity concentration around three ingress corridors.\n\n- Corridor A: burst behavior every 11m\n- Corridor B: stable low-latency packet flow\n- Corridor C: periodic mirror signatures\n\n> Dataset values are anonymized and normalized for archive publication.`,
    downloadFileName: "ingress-heatmap.md",
  },
  {
    id: "access-ledger",
    title: "Access Ledger Delta",
    date: "2026-04-16",
    classification: "Confidential",
    format: "markdown",
    isSimulation: true,
    preview:
      "Account delta report with role changes, access-time anomalies, and masked operators.",
    content: `# ACCESS LEDGER DELTA\n\n- Operator role transitions: 19\n- Elevated token sessions: 4\n- Unusual off-hour accesses: 7\n\n[[REDACTED]] entries indicate anonymized identifiers in this record.`,
    downloadFileName: "access-ledger-delta.md",
  },
  {
    id: "kernel-brief",
    title: "Kernel Event Briefing (PDF Style)",
    date: "2026-04-16",
    classification: "Top Secret",
    format: "pdf",
    isSimulation: true,
    preview:
      "PDF-style briefing summarizing kernel alerts, service restarts, and maintenance windows.",
    content: `KERNEL EVENT BRIEFING\n\nEvent classes:\n- watchdog reset\n- scheduler drift\n- auth retry spikes\n\nNo direct infrastructure attribution is included in this publication copy.`,
    downloadFileName: "kernel-event-briefing.pdf",
  },
  {
    id: "storage-audit",
    title: "Storage Audit Summary (PDF Style)",
    date: "2026-04-15",
    classification: "Redacted",
    format: "pdf",
    isSimulation: true,
    preview:
      "Storage summary with object growth trendlines and anonymized archive segments.",
    content: `STORAGE AUDIT SUMMARY\n\n- Segment growth: +8.4%\n- Archive rotation: 3 cycles\n- Integrity checks: pass\n\nIdentifiers are masked in this release package.`,
    downloadFileName: "storage-audit-summary.pdf",
  },
  {
    id: "red-team-log",
    title: "Red Team Timeline",
    date: "2026-04-14",
    classification: "Top Secret",
    format: "markdown",
    isSimulation: true,
    preview:
      "Timeline combining reconnaissance, escalation, and containment checkpoints.",
    content: `# RED TEAM TIMELINE\n\n1. Recon run initiated (T+00)\n2. Lateral route identified (T+17)\n3. Access gate re-keyed (T+31)\n4. Containment protocol executed (T+49)\n\n[[REDACTED]] phases are masked in this publication timeline.`,
    downloadFileName: "red-team-timeline.md",
  },
  {
    id: "ops-brief-042",
    title: "Operations Brief 042",
    date: "2026-04-13",
    classification: "Confidential",
    format: "markdown",
    isSimulation: true,
    preview:
      "Daily operations brief with queue pressure notes and restricted maintenance signals.",
    content: `# OPERATIONS BRIEF 042\n\n- Queue pressure: moderate\n- Maintenance windows: aligned\n- Alert severity index: low\n\nBriefing metadata is normalized for controlled distribution.`,
    downloadFileName: "operations-brief-042.md",
  },
];

export function getDocumentById(id: string): LeakDocument | undefined {
  return LEAK_DOCUMENTS.find((doc) => doc.id === id);
}

