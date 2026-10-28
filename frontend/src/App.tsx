import { useEffect, useState } from "react";
import InvadersGame from "./game/InvadersGame";
import { fetchLeaderboard, submitScore, ScoreEntry } from "./api";

export default function App() {
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const loadLeaderboard = () => {
    fetchLeaderboard()
      .then(setLeaderboard)
      .catch(() => setLeaderboardError("バックエンドに接続できません（スコア保存は無効です）"));
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const handleGameOver = (score: number) => {
    setLastScore(score);
    setSubmitted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lastScore === null) return;
    try {
      const updated = await submitScore(playerName || "ANONYMOUS", lastScore);
      setLeaderboard(updated);
      setSubmitted(true);
    } catch {
      setLeaderboardError("スコアの送信に失敗しました");
    }
  };

  return (
    <div className="app">
      <h1>SPACE INVADERS</h1>
      <div className="layout">
        <InvadersGame onGameOver={handleGameOver} />
        <aside className="side-panel">
          <section>
            <h3>操作方法</h3>
            <ul>
              <li>← → / A D : 移動</li>
              <li>SPACE : 発射</li>
            </ul>
          </section>
          <section>
            <h3>ハイスコア</h3>
            {leaderboardError && <p className="error">{leaderboardError}</p>}
            <ol className="leaderboard">
              {leaderboard.map((entry, i) => (
                <li key={i}>
                  <span className="rank">{i + 1}</span>
                  <span className="name">{entry.playerName}</span>
                  <span className="score">{entry.score}</span>
                </li>
              ))}
              {leaderboard.length === 0 && !leaderboardError && <li className="empty">まだ記録がありません</li>}
            </ol>
          </section>
          {lastScore !== null && !submitted && (
            <form className="submit-form" onSubmit={handleSubmit}>
              <h3>スコア登録: {lastScore}</h3>
              <input
                type="text"
                maxLength={12}
                placeholder="NAME"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <button type="submit">登録する</button>
            </form>
          )}
          {submitted && <p className="submitted-msg">登録しました！</p>}
        </aside>
      </div>
    </div>
  );
}
