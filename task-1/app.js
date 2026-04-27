/* ─── Fictional employee data ──────────────────────────────────────────────
   All names, roles, and department codes are entirely made up.
   No real personal information is used.
   ─────────────────────────────────────────────────────────────────────── */

const EMPLOYEES = [
  {
    id: 1,
    name: "Alex Chen",
    role: "Senior Developer",
    dept: "NA.U2.D3.G1",
    color: "#3B82F6",
    activities: [
      {
        name: "[CONF] Cloud Native Summit Keynote",
        category: "Presentation",
        date: "2025-11-18",
        points: 80,
      },
      {
        name: "[TECH] Microservices Architecture Workshop",
        category: "Presentation",
        date: "2025-10-22",
        points: 40,
      },
      {
        name: "[TECH] CI/CD Pipeline Deep Dive",
        category: "Presentation",
        date: "2025-09-10",
        points: 40,
      },
      {
        name: "[TECH] Code Review Best Practices",
        category: "Presentation",
        date: "2025-08-05",
        points: 40,
      },
      {
        name: "[CONF] DevOps Summit Talk",
        category: "Presentation",
        date: "2025-07-15",
        points: 80,
      },
      {
        name: "[TECH] Docker & Kubernetes Intro",
        category: "Presentation",
        date: "2025-06-20",
        points: 40,
      },
      {
        name: "[TECH] Spring Boot Deep Dive",
        category: "Presentation",
        date: "2025-05-12",
        points: 40,
      },
      {
        name: "[TECH] REST API Design Patterns",
        category: "Presentation",
        date: "2025-04-08",
        points: 40,
      },
      {
        name: "[TECH] Database Query Optimization",
        category: "Presentation",
        date: "2025-03-18",
        points: 40,
      },
      {
        name: "[TECH] Git Advanced Workflows",
        category: "Presentation",
        date: "2025-02-11",
        points: 40,
      },
      {
        name: "[TECH] Testing Strategies Overview",
        category: "Presentation",
        date: "2025-01-22",
        points: 40,
      },
      {
        name: "[CONF] Platform Engineering Forum",
        category: "Presentation",
        date: "2024-11-08",
        points: 80,
      },
      {
        name: "[TECH] SOLID Principles Session",
        category: "Presentation",
        date: "2024-09-15",
        points: 40,
      },
      {
        name: "[TECH] Observability in Production",
        category: "Presentation",
        date: "2024-06-25",
        points: 40,
      },
      {
        name: "[TECH] Security Practices in Dev",
        category: "Presentation",
        date: "2024-03-10",
        points: 40,
      },
    ],
    // 2025 total: 80+40+40+40+80+40+40+40+40+40+40 = 560
    // All-time: 560 + 80+40+40+40 = 760
  },
  {
    id: 2,
    name: "Jordan Blake",
    role: "Group Manager",
    dept: "EU.U1.G3",
    color: "#10B981",
    activities: [
      {
        name: "[TECH] Team Leadership Seminar",
        category: "Presentation",
        date: "2025-11-20",
        points: 40,
      },
      {
        name: "[TECH] Agile Transformation Workshop",
        category: "Presentation",
        date: "2025-10-14",
        points: 40,
      },
      {
        name: "[TECH] OKR Framework Deep Dive",
        category: "Presentation",
        date: "2025-08-19",
        points: 40,
      },
      {
        name: "[CONF] Engineering Leaders Forum",
        category: "Presentation",
        date: "2025-06-11",
        points: 80,
      },
      {
        name: "[TECH] Hiring Process Best Practices",
        category: "Presentation",
        date: "2025-04-23",
        points: 40,
      },
      {
        name: "[TECH] Performance Review Workshop",
        category: "Presentation",
        date: "2025-02-07",
        points: 40,
      },
      {
        name: "[TECH] Remote Team Collaboration",
        category: "Presentation",
        date: "2024-12-12",
        points: 40,
      },
      {
        name: "[TECH] Cross-team Dependency Management",
        category: "Presentation",
        date: "2024-10-03",
        points: 40,
      },
      {
        name: "[TECH] Onboarding Experience Design",
        category: "Presentation",
        date: "2024-07-22",
        points: 40,
      },
      {
        name: "[CONF] People Operations Summit",
        category: "Presentation",
        date: "2024-04-18",
        points: 80,
      },
    ],
    // 2025 total: 40+40+40+80+40+40 = 280; All-time: 280+40+40+40+80 = 480
  },
  {
    id: 3,
    name: "Morgan Taylor",
    role: "Lead QA Engineer",
    dept: "NA.U1.D2.G1.T1",
    color: "#EF4444",
    activities: [
      {
        name: "[REG] Mentoring of Jordan Hill",
        category: "Education",
        date: "2025-11-28",
        points: 96,
      },
      {
        name: "[REG] Mentoring of Casey Reed",
        category: "Education",
        date: "2025-10-05",
        points: 96,
      },
      {
        name: "[TECH] Test Automation Workshop",
        category: "Presentation",
        date: "2025-09-17",
        points: 40,
      },
      {
        name: "[REG] Mentoring of Robin Park",
        category: "Education",
        date: "2025-07-14",
        points: 96,
      },
      {
        name: "[TECH] QA Metrics and Reporting",
        category: "Presentation",
        date: "2025-04-30",
        points: 40,
      },
      {
        name: "[REG] Mentoring of Devon Marsh",
        category: "Education",
        date: "2025-02-20",
        points: 96,
      },
      {
        name: "[REG] Mentoring of Skyler Grant",
        category: "Education",
        date: "2024-11-05",
        points: 96,
      },
      {
        name: "[TECH] Exploratory Testing Techniques",
        category: "Presentation",
        date: "2024-08-14",
        points: 40,
      },
    ],
    // 2025: 96+96+40+96+40+96 = 464; All-time: 464+96+40 = 600
  },
  {
    id: 4,
    name: "Riley Anderson",
    role: "Lead QA Engineer",
    dept: "EU.U1.D3.G1.T1",
    color: "#8B5CF6",
    activities: [
      {
        name: "[REG] Mentoring of Quinn Norris",
        category: "Education",
        date: "2025-11-30",
        points: 96,
      },
      {
        name: "[REG] Mentoring of Avery Stone",
        category: "Education",
        date: "2025-10-03",
        points: 96,
      },
      {
        name: "[TECH] QA Metrics Presentation",
        category: "Presentation",
        date: "2025-09-16",
        points: 40,
      },
      {
        name: "[REG] Mentoring of Logan Crane",
        category: "Education",
        date: "2025-07-21",
        points: 96,
      },
      {
        name: "[TECH] Shift-Left Testing Talk",
        category: "Presentation",
        date: "2025-05-06",
        points: 40,
      },
      {
        name: "[REG] Mentoring of Peyton Cruz",
        category: "Education",
        date: "2025-02-14",
        points: 96,
      },
      {
        name: "[REG] Mentoring of Finley Ross",
        category: "Education",
        date: "2024-10-22",
        points: 96,
      },
      {
        name: "[TECH] Risk-based Testing Overview",
        category: "Presentation",
        date: "2024-07-09",
        points: 40,
      },
    ],
    // same structure as Morgan → similar totals
  },
  {
    id: 5,
    name: "Casey Williams",
    role: "QA Engineer",
    dept: "NA.U2.DQA1.T1",
    color: "#F59E0B",
    activities: [
      {
        name: "[COURSE] Automation Testing Bootcamp",
        category: "Education",
        date: "2025-11-22",
        points: 48,
      },
      {
        name: "[COURSE] Advanced Selenium Techniques",
        category: "Education",
        date: "2025-10-14",
        points: 48,
      },
      {
        name: "[COURSE] API Testing with Postman",
        category: "Education",
        date: "2025-09-08",
        points: 48,
      },
      {
        name: "[COURSE] Performance Testing Basics",
        category: "Education",
        date: "2025-07-30",
        points: 48,
      },
      {
        name: "[COURSE] BDD with Cucumber",
        category: "Education",
        date: "2025-05-20",
        points: 48,
      },
      {
        name: "[COURSE] Test Data Management",
        category: "Education",
        date: "2025-03-11",
        points: 48,
      },
      {
        name: "[COURSE] Cypress End-to-End Framework",
        category: "Education",
        date: "2025-01-28",
        points: 48,
      },
      {
        name: "[COURSE] SQL for Testers",
        category: "Education",
        date: "2024-11-18",
        points: 48,
      },
      {
        name: "[COURSE] Git Version Control",
        category: "Education",
        date: "2024-09-05",
        points: 48,
      },
    ],
    // 2025: 48×7 = 336; All-time: 336+48+48 = 432
  },
  {
    id: 6,
    name: "Drew Martinez",
    role: "Software Engineer",
    dept: "EU.U1.D2.G2",
    color: "#06B6D4",
    activities: [
      {
        name: "[TECH] React Performance Optimization",
        category: "Presentation",
        date: "2025-11-19",
        points: 40,
      },
      {
        name: "[TECH] State Management Patterns",
        category: "Presentation",
        date: "2025-10-08",
        points: 40,
      },
      {
        name: "[COURSE] TypeScript Advanced Techniques",
        category: "Education",
        date: "2025-09-01",
        points: 48,
      },
      {
        name: "[TECH] Frontend Architecture Overview",
        category: "Presentation",
        date: "2025-07-17",
        points: 40,
      },
      {
        name: "[TECH] Web Accessibility Standards",
        category: "Presentation",
        date: "2025-05-27",
        points: 40,
      },
      {
        name: "[COURSE] Next.js Deep Dive",
        category: "Education",
        date: "2025-04-10",
        points: 48,
      },
      {
        name: "[TECH] CSS Architecture Patterns",
        category: "Presentation",
        date: "2025-02-24",
        points: 40,
      },
      {
        name: "[TECH] Component-Driven Design",
        category: "Presentation",
        date: "2024-12-16",
        points: 40,
      },
      {
        name: "[COURSE] GraphQL Fundamentals",
        category: "Education",
        date: "2024-09-30",
        points: 48,
      },
    ],
    // 2025 total: 40+40+48+40+40+48+40 = 296; All-time: 296+40+48 = 384
  },
  {
    id: 7,
    name: "Sam Johnson",
    role: "HR Manager",
    dept: "AU.TAD.SO",
    color: "#F97316",
    activities: [
      {
        name: "[REG] Mentoring of Alex Rivera",
        category: "Education",
        date: "2025-11-30",
        points: 96,
      },
      {
        name: "[REG] Mentoring of Dana Kim",
        category: "Education",
        date: "2025-10-03",
        points: 96,
      },
      {
        name: "[REG] Mentoring of Pat Nguyen",
        category: "Education",
        date: "2025-09-16",
        points: 96,
      },
      {
        name: "[COURSE] Talent Acquisition Strategies",
        category: "Education",
        date: "2025-06-22",
        points: 48,
      },
      {
        name: "[COURSE] Employee Engagement Methods",
        category: "Education",
        date: "2025-03-14",
        points: 48,
      },
      {
        name: "[REG] Mentoring of Sam Torres",
        category: "Education",
        date: "2024-11-20",
        points: 96,
      },
    ],
    // 2025: 96+96+96+48+48 = 384; All-time: 384+96 = 480
  },
  {
    id: 8,
    name: "Taylor Lee",
    role: "Senior QA Engineer",
    dept: "APAC.Services",
    color: "#475569",
    activities: [
      {
        name: "[COURSE] Performance Testing Masterclass",
        category: "Education",
        date: "2025-11-25",
        points: 72,
      },
      {
        name: "[COURSE] Security Testing Fundamentals",
        category: "Education",
        date: "2025-10-18",
        points: 72,
      },
      {
        name: "[COURSE] Mobile App Testing",
        category: "Education",
        date: "2025-08-09",
        points: 72,
      },
      {
        name: "[COURSE] Load Testing with k6",
        category: "Education",
        date: "2025-06-03",
        points: 72,
      },
      {
        name: "[COURSE] Test Planning & Strategy",
        category: "Education",
        date: "2024-12-11",
        points: 72,
      },
      {
        name: "[COURSE] AI-powered Testing Tools",
        category: "Education",
        date: "2024-09-28",
        points: 72,
      },
    ],
    // 2025: 72×4 = 288; All-time: 288+72+72 = 432
  },
  {
    id: 9,
    name: "Avery Brown",
    role: "QA Engineer",
    dept: "NA.U2.DQA1.T2",
    color: "#DC2626",
    activities: [
      {
        name: "[COURSE] Cypress Testing Framework",
        category: "Education",
        date: "2025-11-27",
        points: 48,
      },
      {
        name: "[COURSE] BDD with Gherkin",
        category: "Education",
        date: "2025-10-20",
        points: 48,
      },
      {
        name: "[COURSE] Test Strategy Planning",
        category: "Education",
        date: "2025-09-14",
        points: 48,
      },
      {
        name: "[COURSE] Playwright Automation",
        category: "Education",
        date: "2025-07-08",
        points: 48,
      },
      {
        name: "[COURSE] Agile Testing Practices",
        category: "Education",
        date: "2025-05-19",
        points: 48,
      },
      {
        name: "[COURSE] Unit Testing Principles",
        category: "Education",
        date: "2025-03-06",
        points: 48,
      },
      {
        name: "[COURSE] Contract Testing with Pact",
        category: "Education",
        date: "2024-12-03",
        points: 48,
      },
      {
        name: "[COURSE] Visual Regression Testing",
        category: "Education",
        date: "2024-10-15",
        points: 48,
      },
    ],
    // 2025: 48×6 = 288; All-time: 288+48+48 = 384
  },
  {
    id: 10,
    name: "Quinn Davis",
    role: "Frontend Developer",
    dept: "EU.U1.D1.G2",
    color: "#7C3AED",
    activities: [
      {
        name: "[TECH] Vue.js Component Architecture",
        category: "Presentation",
        date: "2025-11-15",
        points: 40,
      },
      {
        name: "[COURSE] Advanced CSS Architecture",
        category: "Education",
        date: "2025-10-08",
        points: 48,
      },
      {
        name: "[TECH] Web Performance Budgets",
        category: "Presentation",
        date: "2025-08-21",
        points: 40,
      },
      {
        name: "[COURSE] Design Systems Fundamentals",
        category: "Education",
        date: "2025-06-17",
        points: 48,
      },
      {
        name: "[COURSE] SVG & Animation Techniques",
        category: "Education",
        date: "2025-04-03",
        points: 48,
      },
      {
        name: "[TECH] Micro-frontend Patterns",
        category: "Presentation",
        date: "2025-02-19",
        points: 40,
      },
      {
        name: "[COURSE] Browser DevTools Mastery",
        category: "Education",
        date: "2024-11-26",
        points: 48,
      },
      {
        name: "[TECH] CSS Grid & Flexbox Workshop",
        category: "Presentation",
        date: "2024-09-10",
        points: 40,
      },
    ],
    // 2025: 40+48+40+48+48+40 = 264; All-time: 264+48+40 = 352
  },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getQuarter(dateStr) {
  const month = parseInt(dateStr.split("-")[1], 10);
  return Math.ceil(month / 3);
}

function getYear(dateStr) {
  return dateStr.split("-")[0];
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d}-${monthNames[parseInt(m, 10) - 1]}-${y}`;
}

/* ─── Filter & rank ──────────────────────────────────────────────────────── */

function applyFilters(yearVal, quarterVal, categoryVal, searchVal) {
  const search = searchVal.trim().toLowerCase();

  return EMPLOYEES.map((emp) => {
    const filtered = emp.activities.filter((act) => {
      if (yearVal && getYear(act.date) !== yearVal) return false;
      if (quarterVal && String(getQuarter(act.date)) !== quarterVal)
        return false;
      if (categoryVal && act.category !== categoryVal) return false;
      return true;
    });

    const total = filtered.reduce((s, a) => s + a.points, 0);
    const presentations = filtered.filter(
      (a) => a.category === "Presentation",
    ).length;
    const education = filtered.filter((a) => a.category === "Education").length;

    return {
      ...emp,
      filteredActivities: filtered,
      total,
      presentations,
      education,
    };
  })
    .filter((emp) => {
      if (search && !emp.name.toLowerCase().includes(search)) return false;
      return emp.total > 0 || search; // hide 0-point entries unless searching
    })
    .sort((a, b) => b.total - a.total);
}

/* ─── SVG icons ──────────────────────────────────────────────────────────── */

const ICON_MONITOR = `<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;

const ICON_GRADUATION = `<svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;

const ICON_STAR = `<svg class="star-icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

const ICON_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

/* ─── Render podium ──────────────────────────────────────────────────────── */

function renderPodium(ranked) {
  const podiumEl = document.getElementById("podium");
  if (ranked.length === 0) {
    podiumEl.innerHTML = "";
    return;
  }

  const order = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  const rankClass = ["rank-2", "rank-1", "rank-3"];
  const rankNum = [2, 1, 3];

  podiumEl.innerHTML = order
    .map((emp, i) => {
      const rc = rankClass[i];
      const rn = rankNum[i];
      const ini = getInitials(emp.name);

      return `
      <div class="podium-item ${rc}">
        <div class="podium-avatar-wrap">
          <div class="podium-avatar" style="background:${emp.color}">${ini}</div>
          <div class="rank-badge">${rn}</div>
        </div>
        <div class="podium-name">${emp.name}</div>
        <div class="podium-role">${emp.role} (${emp.dept})</div>
        <div class="podium-stars-badge">${ICON_STAR} ${emp.total}</div>
        <div class="podium-block">${rn}</div>
      </div>`;
    })
    .join("");
}

/* ─── Render list ────────────────────────────────────────────────────────── */

function renderList(ranked) {
  const listEl = document.getElementById("list");
  const emptyEl = document.getElementById("empty");

  if (ranked.length === 0) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  listEl.innerHTML = ranked
    .map((emp, idx) => {
      const ini = getInitials(emp.name);
      const rank = idx + 1;
      const hasPr = emp.presentations > 0;
      const hasEd = emp.education > 0;

      const actIcons = `
      ${hasPr ? `<span class="act-stat">${ICON_MONITOR} ${emp.presentations}</span>` : ""}
      ${hasEd ? `<span class="act-stat">${ICON_GRADUATION} ${emp.education}</span>` : ""}
    `;

      const rows = emp.filteredActivities
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
          (act) => `
        <tr>
          <td>${act.name}</td>
          <td><span class="cat-badge">${act.category}</span></td>
          <td>${formatDate(act.date)}</td>
          <td><span class="pts-plus">+${act.points}</span></td>
        </tr>`,
        )
        .join("");

      return `
      <div class="list-item" id="item-${emp.id}">
        <div class="list-item-header" onclick="toggleRow(${emp.id})">
          <span class="list-rank">${rank}</span>
          <div class="list-avatar" style="background:${emp.color}">${ini}</div>
          <div class="list-info">
            <div class="list-name">${emp.name}</div>
            <div class="list-role">${emp.role} (${emp.dept})</div>
          </div>
          <div class="list-activity-icons">${actIcons}</div>
          <div class="list-total-wrap">
            <span class="total-label">Total</span>
            <span class="total-value">${ICON_STAR} ${emp.total}</span>
          </div>
          <div class="chevron-btn">${ICON_CHEVRON}</div>
        </div>
        <div class="activity-panel">
          <div class="activity-panel-title">Recent Activity</div>
          <table class="activity-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Category</th>
                <th>Date</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    })
    .join("");
}

/* ─── Toggle row expand ──────────────────────────────────────────────────── */

function toggleRow(id) {
  const el = document.getElementById(`item-${id}`);
  if (el) el.classList.toggle("expanded");
}

/* ─── Main render ────────────────────────────────────────────────────────── */

function render() {
  const year = document.getElementById("yearFilter").value;
  const quarter = document.getElementById("quarterFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const search = document.getElementById("searchInput").value;

  const ranked = applyFilters(year, quarter, category, search);
  renderPodium(ranked);
  renderList(ranked);
}

/* ─── Event listeners ────────────────────────────────────────────────────── */

document.getElementById("yearFilter").addEventListener("change", render);
document.getElementById("quarterFilter").addEventListener("change", render);
document.getElementById("categoryFilter").addEventListener("change", render);
document.getElementById("searchInput").addEventListener("input", render);

/* ─── Initial render ─────────────────────────────────────────────────────── */
render();
