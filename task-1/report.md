# Task 1 – Leaderboard Clone: Report

## Overview

This report describes how I replicated the internal company leaderboard as a static web application, while complying with responsible AI usage policies by replacing all real personal data with fictional equivalents.

---

## Approach

### 1. UI Analysis (without AI tools)

I manually studied the provided screenshots to identify every UI element before writing any code:

- **Page layout** – light-gray background, centered white card, rounded corners, drop shadow.
- **Filters bar** – three dropdowns (Year, Quarter, Category) and a search input, rendered inside a bordered sub-panel.
- **Podium section** – top-3 displayed as a classic podium: 2nd place on the left (silver), 1st in the center and elevated (gold ring on avatar), 3rd on the right (bronze). Each card shows: avatar with rank badge, full name, role + department code, and a star-count badge; a colored podium block sits below.
- **Ranked list** – each row shows: rank number, circular avatar, name + role, activity-type icon counts (monitor = Presentation, graduation cap = Education), total star score, and a chevron for expand/collapse.
- **Expanded row** – reveals a "Recent Activity" table with columns: Activity name, Category badge, Date, Points.

### 2. Technology choice

Plain **HTML + CSS + JavaScript** (no frameworks, no build step) was chosen because:

- Zero dependencies → trivial GitHub Pages deployment (no CI needed, no `npm install`).
- Easy to review and audit by anyone.
- Matches the static nature of the task.

### 3. Data replacement

The task explicitly requires that **no real names, titles, or department identifiers** be used.

| Original element    | Replacement strategy                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real employee names | Invented Western-style first + last names (e.g., "Alex Chen", "Jordan Blake") — no real individuals                                                               |
| Job titles          | Generic engineering/QA/HR titles matching the structure in the original (Senior Developer, Lead QA Engineer, HR Manager…)                                         |
| Department codes    | Fictional codes following the same dotted-segment pattern as the original (e.g., `NA.U2.D3.G1`, `EU.U1.G3`) — no real org data                                    |
| Profile photos      | Replaced with initials-based colored avatars generated entirely in CSS — no image files, no third-party avatar service                                            |
| Activity names      | Plausible but fictional activity titles in the same `[TAG] Description` style used in the original                                                                |
| Dates and points    | Invented dates spanning 2024–2025, using a consistent fictional points system (Conference = 80 pts, Tech Talk = 40 pts, Mentoring = 96 pts, Course = 48 / 72 pts) |

No corporate data was fed into any AI tool at any stage.

### 4. Functionality implemented

| Feature                                        | Implemented                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| Podium (top 3 with gold/silver/bronze styling) | ✅                                             |
| Ranked list below podium                       | ✅                                             |
| Year filter                                    | ✅ (re-ranks based on points in selected year) |
| Quarter filter                                 | ✅ (Q1–Q4, re-ranks accordingly)               |
| Category filter                                | ✅ (Presentation / Education)                  |
| Employee search                                | ✅ (case-insensitive name search)              |
| Expand/collapse rows                           | ✅ (click row to show Recent Activity table)   |
| Responsive layout                              | ✅ (activity icons hidden on narrow screens)   |

All filters combine: e.g., selecting "2025 / Q4 / Education" shows only education activities from Q4 2025 and re-ranks employees by those filtered totals — employees with zero matching points are hidden.

### 5. Deployment

The app is deployed to **GitHub Pages** from the `task-1/` folder of the repository.

**Steps used:**

1. Pushed source to a public GitHub repository.
2. Enabled GitHub Pages in **Settings → Pages → Source: Deploy from branch**, pointing to the `main` branch and `/task-1` folder (or root if restructured).
3. The live URL is provided in the repository README.

No build process is required; the browser loads `index.html` directly.

---

## Tools used

| Tool                     | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| GitHub Copilot (VS Code) | Code generation for HTML/CSS/JS structure |
| VS Code                  | Editing and file management               |
| GitHub Pages             | Static hosting                            |

No real names or corporate data were provided to any AI tool.
