import { useEffect, useMemo, useState } from "react";
import type { GameModule, GameProps } from "../../../catalog/types.ts";
import { DadSays, TopBar } from "../../../kit/Chrome.tsx";
import { HintBox, Meter, StageStrip, WinCard } from "../../../kit/GameKit.tsx";
import { Slider, fixed } from "../../../kit/Slider.tsx";
import { chime } from "../../../kit/audio.ts";
import { recordStars, sumStars, useGameStars } from "../../../kit/progress.ts";
import { dad, nian, say } from "../../../kit/speech.ts";
import {
  checkGreenhouseGoal,
  computeClimate,
  greenhouseLevels,
  type GreenhouseState
} from "./logic.ts";
import { meta } from "./meta.ts";

const ACCENT = "#0ea5e9";

function GreenhouseGame({ exit, sound, setSound }: GameProps) {
  const settings = { sound, setSound };
  const starMap = useGameStars("greenhouse");
  const [levelId, setLevelId] = useState(greenhouseLevels[0].id);
  const level = greenhouseLevels.find((l) => l.id === levelId) ?? greenhouseLevels[0];

  const [state, setState] = useState<GreenhouseState>(() => ({ ...level.start }));
  const [tries, setTries] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [wonStars, setWonStars] = useState<number | null>(null);

  useEffect(() => {
    if (sound) say(dad(`第${level.id}关，${level.title}。${level.story}`));
  }, [level.id]);

  const climate = useMemo(
    () => computeClimate(level.solarMultiplier, state),
    [level.solarMultiplier, state]
  );
  const passed = checkGreenhouseGoal(level, state);

  function loadStage(id: number) {
    const next = greenhouseLevels.find((l) => l.id === id) ?? greenhouseLevels[0];
    setLevelId(next.id);
    setState({ ...next.start });
    setTries(0);
    setUsedHint(false);
    setWonStars(null);
  }

  function verifyClimate() {
    const nextTries = tries + 1;
    setTries(nextTries);
    if (checkGreenhouseGoal(level, state)) {
      let stars = nextTries <= 1 ? 3 : nextTries <= 3 ? 2 : 1;
      if (usedHint) stars = Math.min(stars, 2);
      recordStars("greenhouse", level.id, stars);
      setWonStars(stars);
      if (sound) {
        chime(true);
        say(nian(level.cheer), dad(level.explain));
      }
    } else if (sound) {
      chime(false);
      say(dad(level.dadTip));
    }
  }

  const blanketAlpha = Math.min(0.68, 0.06 + (state.co2Ppm / 900) * 0.62);
  const iceWidth = Math.round(state.albedo * 440);
  const bounceWidth = Math.max(1.5, state.albedo * 10);
  const backIrWidth = Math.max(1, climate.greenhouseFactor * 7);

  const surfaceColor =
    climate.climateZone === "frozen"
      ? "#93c5fd"
      : climate.climateZone === "habitable"
        ? "#22c55e"
        : climate.climateZone === "cool"
          ? "#38bdf8"
          : "#f97316";

  const nextLevel = greenhouseLevels.find((l) => l.id > level.id);

  return (
    <div className="page">
      <TopBar
        emoji="🌡️"
        title="地球温室调温器 · 辐射平衡与反照率"
        onBack={exit}
        backLabel="地球地理馆"
        stars={sumStars(starMap)}
        maxStars={greenhouseLevels.length * 3}
        settings={settings}
      />

      <StageStrip
        stages={greenhouseLevels}
        activeId={level.id}
        stars={starMap}
        color={ACCENT}
        onSelect={loadStage}
      />

      <DadSays text={level.story} />

      <section className="card workbench">
        <div className="workbench-canvas">
          <svg
            viewBox="0 0 560 320"
            role="img"
            aria-label={`地球温室能量平衡：当前地表平均温度 ${climate.surfaceTempC}°C`}
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 16, background: "#091124" }}
          >
            {/* Outer space & Sun */}
            <circle cx={78} cy={62} r={26 * level.solarMultiplier} fill="#facc15" />
            <text x={122} y={32} fill="#fde047" fontSize={13} fontWeight={700}>
              ☀️ 入射阳光 {climate.solarInWM2.toFixed(0)} W/m² · 反射 {climate.reflectedWM2.toFixed(0)} W/m²
            </text>

            {/* Greenhouse gas atmospheric blanket */}
            <rect
              x={36}
              y={112}
              width={488}
              height={46}
              rx={22}
              fill={`rgba(56, 189, 248, ${blanketAlpha.toFixed(2)})`}
              stroke="#38bdf8"
              strokeDasharray="6 4"
            />
            <text x={280} y={140} textAnchor="middle" fill="#f8fafc" fontSize={12} fontWeight={800}>
              ☁️ 温室大气棉被 CO₂ = {state.co2Ppm} ppm
            </text>

            {/* Shortwave yellow sunlight down & reflected arrow */}
            <line x1={104} y1={76} x2={196} y2={236} stroke="#facc15" strokeWidth={6} strokeLinecap="round" />
            <line
              x1={196}
              y1={236}
              x2={252}
              y2={68}
              stroke="#fef08a"
              strokeWidth={bounceWidth}
              strokeDasharray="6 4"
              strokeLinecap="round"
            />

            {/* Longwave red infrared radiation up & greenhouse back-radiation down */}
            <line x1={356} y1={236} x2={356} y2={66} stroke="#fb7185" strokeWidth={5} strokeLinecap="round" />
            {state.co2Ppm > 0 && (
              <path
                d="M 366 146 C 414 146 426 196 404 234"
                fill="none"
                stroke="#f97316"
                strokeWidth={backIrWidth}
                strokeLinecap="round"
              />
            )}
            <text x={458} y={194} textAnchor="middle" fill="#fdba74" fontSize={11} fontWeight={700}>
              红外逆辐射保温
            </text>

            {/* Planetary ocean/land + white ice-cap albedo sheet */}
            <rect x={44} y={238} width={472} height={40} rx={12} fill={surfaceColor} />
            <rect x={44} y={238} width={iceWidth} height={16} rx={8} fill="#f8fafc" opacity={0.92} />
            <text x={280} y={268} textAnchor="middle" fill="#0f172a" fontSize={12} fontWeight={800}>
              🌍 地表反照率 α = {state.albedo.toFixed(2)}（白冰盖越宽反射越强）
            </text>

            {/* Bottom temperature readout */}
            <text
              x={280}
              y={305}
              textAnchor="middle"
              fill={passed ? "#4ade80" : "#fde047"}
              fontSize={13}
              fontWeight={800}
            >
              全球平均气温：{climate.surfaceTempC > 0 ? `+${climate.surfaceTempC}` : climate.surfaceTempC}°C（宜居目标 {level.minTempC}°C ~ {level.maxTempC}°C）
            </text>
          </svg>
        </div>

        <div className="workbench-side">
          {!level.lockCo2 && (
            <Slider
              label="大气温室气体浓度 CO₂"
              value={state.co2Ppm}
              min={0}
              max={level.maxCo2Ppm ?? 860}
              step={10}
              format={fixed(0, "ppm")}
              color="#f97316"
              onChange={(v) => {
                setState((s) => ({ ...s, co2Ppm: v }));
                setWonStars(null);
              }}
            />
          )}

          {!level.lockAlbedo && (
            <Slider
              label="行星冰雪与云层反照率 α"
              value={state.albedo}
              min={0.12}
              max={0.64}
              step={0.02}
              format={fixed(2)}
              color="#38bdf8"
              onChange={(v) => {
                setState((s) => ({ ...s, albedo: v }));
                setWonStars(null);
              }}
            />
          )}

          <Meter
            label="宜居温度匹配"
            pct={
              passed
                ? 100
                : Math.max(
                    10,
                    Math.round(
                      100 - Math.abs(climate.surfaceTempC - (level.minTempC + level.maxTempC) / 2) * 3.5
                    )
                  )
            }
            valueText={`${climate.surfaceTempC}°C`}
          />

          <div className="play-actions">
            <button type="button" className="primary-btn" onClick={verifyClimate}>
              🌍 测算全球均温
            </button>
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                setUsedHint(true);
                if (sound) say(dad(level.dadTip));
              }}
            >
              💡 听爸爸提示
            </button>
          </div>

          {usedHint && <HintBox text={level.dadTip} />}
        </div>
      </section>

      {wonStars !== null && (
        <WinCard
          stars={wonStars}
          cheer={level.cheer}
          explain={level.explain}
          nextLabel={nextLevel ? `下一关 · ${nextLevel.title} →` : undefined}
          onNext={nextLevel ? () => loadStage(nextLevel.id) : undefined}
          onAgain={() => loadStage(level.id)}
        />
      )}
    </div>
  );
}

export const greenhouse: GameModule = { meta, Play: GreenhouseGame };
