const KEYS = {
  weeklyMilesTarget: "hl_weekly_miles_target",
  firstVisit: "hl_first_visit",
};

export function getWeeklyMilesTarget(): number {
  const v = localStorage.getItem(KEYS.weeklyMilesTarget);
  return v ? parseInt(v, 10) : 2500;
}

export function setWeeklyMilesTarget(n: number) {
  localStorage.setItem(KEYS.weeklyMilesTarget, String(n));
}

export function isFirstVisit(): boolean {
  return !localStorage.getItem(KEYS.firstVisit);
}

export function markVisited() {
  localStorage.setItem(KEYS.firstVisit, "1");
}
