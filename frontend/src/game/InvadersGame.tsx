import { useEffect, useRef, useState } from "react";
import { GameEngine, FIELD_WIDTH, FIELD_HEIGHT, Snapshot } from "./engine";

interface Props {
  onGameOver: (score: number) => void;
}

export interface InvadersGameHandle {
  reset: () => void;
}

export default function InvadersGame({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>({ status: "READY", score: 0, lives: 3, wave: 1 });
  const reportedGameOver = useRef(false);

  if (!engineRef.current) {
    engineRef.current = new GameEngine();
  }

  useEffect(() => {
    const engine = engineRef.current!;
    engine.start();

    const keyMap: Record<string, "left" | "right" | "shoot"> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      a: "left",
      d: "right",
      A: "left",
      D: "right",
      " ": "shoot",
      Spacebar: "shoot",
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const action = keyMap[e.key];
      if (action) {
        e.preventDefault();
        engine.input[action] = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const action = keyMap[e.key];
      if (action) {
        e.preventDefault();
        engine.input[action] = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let lastTime = performance.now();
    let frameId: number;

    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      engine.update(dt);

      if (engine.status === "WAVE_CLEAR") {
        engine.nextWave();
      }

      engine.render(ctx);
      const snap = engine.snapshot();
      setSnapshot((prev) =>
        prev.score !== snap.score || prev.lives !== snap.lives || prev.wave !== snap.wave || prev.status !== snap.status
          ? snap
          : prev
      );

      if (snap.status === "GAME_OVER" && !reportedGameOver.current) {
        reportedGameOver.current = true;
        onGameOver(snap.score);
      }

      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = () => {
    reportedGameOver.current = false;
    engineRef.current?.reset();
  };

  const setTouchInput = (action: "left" | "right" | "shoot", value: boolean) => (e: React.PointerEvent) => {
    e.preventDefault();
    engineRef.current!.input[action] = value;
  };

  return (
    <div className="game-wrapper">
      <div className="hud">
        <span>SCORE: {snapshot.score}</span>
        <span>WAVE: {snapshot.wave}</span>
        <span>LIVES: {"▲".repeat(Math.max(0, snapshot.lives))}</span>
      </div>
      <canvas ref={canvasRef} width={FIELD_WIDTH} height={FIELD_HEIGHT} className="game-canvas" />
      {snapshot.status === "GAME_OVER" && (
        <div className="overlay">
          <h2>GAME OVER</h2>
          <p>SCORE: {snapshot.score}</p>
          <button onClick={restart}>RESTART</button>
        </div>
      )}
      <div className="touch-controls">
        <button
          className="touch-btn"
          onPointerDown={setTouchInput("left", true)}
          onPointerUp={setTouchInput("left", false)}
          onPointerLeave={setTouchInput("left", false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          ◀
        </button>
        <button
          className="touch-btn"
          onPointerDown={setTouchInput("right", true)}
          onPointerUp={setTouchInput("right", false)}
          onPointerLeave={setTouchInput("right", false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          ▶
        </button>
        <button
          className="touch-btn touch-btn-shoot"
          onPointerDown={setTouchInput("shoot", true)}
          onPointerUp={setTouchInput("shoot", false)}
          onPointerLeave={setTouchInput("shoot", false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          FIRE
        </button>
      </div>
    </div>
  );
}
