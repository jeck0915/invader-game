export interface ScoreEntry {
  playerName: string;
  score: number;
  recordedAt: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchLeaderboard(): Promise<ScoreEntry[]> {
  const res = await fetch(`${API_BASE}/api/scores`);
  if (!res.ok) throw new Error(`Failed to fetch leaderboard: ${res.status}`);
  return res.json();
}

export async function submitScore(playerName: string, score: number): Promise<ScoreEntry[]> {
  const res = await fetch(`${API_BASE}/api/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerName, score }),
  });
  if (!res.ok) throw new Error(`Failed to submit score: ${res.status}`);
  return res.json();
}
