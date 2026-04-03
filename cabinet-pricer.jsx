import { useState, useRef, useCallback } from "react";

const GRADES = ["Builder Grade", "Semi-Custom", "Custom", "Luxury / Bespoke"];
const BOX_TYPES = ["Particleboard", "Plywood", "Solid Wood"];
const DOOR_STYLES = ["Full Overlay", "Inset", "Beaded Inset", "Shaker"];
const FINISHES = ["Thermofoil", "Painted", "Stained", "Two-Tone"];
const HARDWARE = ["Basic Soft Close", "Blum Soft Close", "Grass / Hettich", "Premium (Hafele)"];

const S = {
  cream: "#f5f0e8", warm: "#faf8f4", charcoal: "#2a2520",
  brown: "#6b5744", gold: "#c4a24d", border: "#d4c9b8",
  light: "#f0ebe0", red: "#8b3a3a", redbg: "#fdf0f0"
};

const mono = { fontFamily: "monospace" };
const labelSt = { fontFamily: "monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 6 };
const cell = (right) => ({ padding: "10px 14px", background: S.warm, borderBottom: `1px solid ${S.border}`, textAlign: right ? "right" : "left" });
const totalCell = (right) => ({ padding: "10px 14px", background: S.light, fontWeight: 700, textAlign: right ? "right" : "left" });

export default function CabinetPricer() {
  const [mode, setMode] = useState("layout");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [grade, setGrade] = useState("Semi-Custom");
  const [box, setBox] = useState("Plywood");
  const [door, setDoor] = useState("Inset");
  const [finish, setFinish] = useState("Painted");
  const [hardware, setHardware] = useState("Blum Soft Close");
  const [targetPrice, setTargetPrice] = useState("");
  const [roomWidth, setRoomWidth] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [photoResults, setPhotoResults] = useState(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  const galleryRef = useRef();
  const cameraRef = useRef();

  const switchMode = (m) => {
    setMode(m); setFiles([]); setPreviews([]);
    setResults(null); setPhotoResults(null); setError("");
  };

  const handleFiles = useCallback((newFiles) => {
    Array.from(newFiles).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = e => {
        const src = e.target.result;
        setPreviews(p => [...p, { src, name: file.name }]);
        setFiles(f => [...f, { b64: src.split(",")[1], type: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeFile = (i) => {
    setFiles(f => f.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const fmt = n => "$" + Math.round(n).toLocaleString();
  const fmtLF = n => parseFloat(n).toFixed(1);

  const callAPI = async (contentBlocks) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: contentBlocks }]
      })
    });
    const data = await res.json();
    const text = data.content.map(i => i.text || "").join("");
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  };

  const analyzeLayout = async () => {
    if (!files.length) { setError("Please upload at least one cabinet drawing."); return; }
    setError(""); setLoading(true); setResults(null);
    try {
      const blocks = [
        ...files.map(f => ({ type: "image", source: { type: "base64", media_type: f.type, data: f.b64 } })),
        {
          type: "text", text: `You are an expert custom cabinet estimator. Analyze these cabinet elevation drawings.
Specs: Grade: ${grade}, Box: ${box}, Door: ${door}, Finish: ${finish}, Hardware: ${hardware}
${targetPrice ? `Total sale price: $${parseInt(targetPrice).toLocaleString()}. Use this exact total.` : "Estimate fair market price."}
1. Identify each wall/elevation, extract dimensions, calculate LF
2. Split upper/lower (lowers ~60% cost, uppers ~40%)
3. Note special features
Respond ONLY with valid JSON, no markdown fences:
{"walls":[{"name":"string","totalLF":0.0,"upperLF":0.0,"lowerLF":0.0,"upperCost":0,"lowerCost":0,"totalCost":0,"costPerLF":0,"features":["string"]}],"totalLF":0.0,"totalUpperLF":0.0,"totalLowerLF":0.0,"totalUpperCost":0,"totalLowerCost":0,"grandTotal":0,"upperCostPerLF":0,"lowerCostPerLF":0,"blendedCostPerLF":0,"specs":["string"],"notes":"string"}`
        }
      ];
      setResults(await callAPI(blocks));
    } catch (e) { setError("Analysis failed: " + e.message); }
    finally { setLoading(false); }
  };

  const analyzePhoto = async () => {
    if (!files.length) { setError("Please upload at least one photo."); return; }
    setError(""); setLoading(true); setPhotoResults(null);
    try {
      const blocks = [
        ...files.map(f => ({ type: "image", source: { type: "base64", media_type: f.type, data: f.b64 } })),
        {
          type: "text", text: `You are an expert cabinet estimator with 20 years experience. Analyze these cabinet photos.
${roomWidth ? `User says cabinet run is ~${roomWidth} inches wide total.` : "Estimate width from proportions."}
${targetPrice ? `Target sale price: $${parseInt(targetPrice).toLocaleString()}.` : "Estimate fair market pricing."}
Customer wants: Grade: ${grade}, Box: ${box}, Door: ${door}, Finish: ${finish}, Hardware: ${hardware}
From photos: identify style/finish/door type, estimate LF for uppers and lowers, note special features and condition.
Price based on customer's requested specs. Lowers ~60% of cost, uppers ~40%.
Respond ONLY with valid JSON, no markdown fences:
{"detectedStyle":"string","detectedFinish":"string","detectedDoorStyle":"string","specialFeatures":["string"],"condition":"string","estimatedUpperLF":0.0,"estimatedLowerLF":0.0,"estimatedTotalLF":0.0,"upperCost":0,"lowerCost":0,"grandTotal":0,"upperCostPerLF":0,"lowerCostPerLF":0,"blendedCostPerLF":0,"confidence":"Low/Medium/High","confidenceReason":"string","recommendations":["string"],"notes":"string"}`
        }
      ];
      setPhotoResults(await callAPI(blocks));
    } catch (e) { setError("Analysis failed: " + e.message); }
    finally { setLoading(false); }
  };

  const confidenceColor = (c) => c === "High" ? "#4a7c59" : c === "Medium" ? S.gold : S.red;

  // ── Reusable UI pieces ──────────────────────────────────────
  const Sel = ({ lbl, val, set, opts }) => (
    <div>
      <div style={labelSt}>{lbl}</div>
      <select value={val} onChange={e => set(e.target.value)}
        style={{ width: "100%", background: S.warm, border: `1px solid ${S.border}`, padding: "10px 14px", ...mono, fontSize: 13, color: S.charcoal, outline: "none" }}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  const Num = ({ lbl, val, set, ph }) => (
    <div>
      <div style={labelSt}>{lbl}</div>
      <input type="number" placeholder={ph} value={val} onChange={e => set(e.target.value)}
        style={{ width: "100%", background: S.warm, border: `1px solid ${S.border}`, padding: "10px 14px", ...mono, fontSize: 13, color: S.charcoal, outline: "none" }} />
    </div>
  );

  const TH = ({ cols }) => (
    <thead><tr>{cols.map((h, i) => (
      <th key={h} style={{ background: S.charcoal, color: S.cream, padding: "10px 14px", textAlign: i === 0 ? "left" : "right", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
    ))}</tr></thead>
  );

  const Btn = ({ onClick, label }) => (
    <button onClick={onClick} disabled={loading}
      style={{ width: "100%", background: loading ? S.brown : S.charcoal, color: S.cream, border: "none", padding: 18, ...mono, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", marginBottom: 32 }}>
      {loading ? "⏳  Analyzing..." : label}
    </button>
  );

  const Previews = () => previews.length > 0 ? (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
      {previews.map((p, i) => (
        <div key={i} style={{ position: "relative", width: 80, height: 80, border: `1px solid ${S.border}`, overflow: "hidden", flexShrink: 0 }}>
          <img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button onClick={() => removeFile(i)}
            style={{ position: "absolute", top: 2, right: 2, background: S.charcoal, color: "white", border: "none", width: 20, height: 20, cursor: "pointer", fontSize: 13, lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  ) : null;

  // ── Drop zone (layout mode) ─────────────────────────────────
  const DropZone = () => (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
      style={{ border: `2px dashed ${drag ? S.gold : S.border}`, background: drag ? "#fdf9f0" : S.warm, padding: "36px 24px", textAlign: "center", marginBottom: 16, transition: "all 0.2s" }}
    >
      <div style={{ fontSize: 36, marginBottom: 10 }}>📐</div>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Drop Drawings Here</div>

      {/* Visible file input — works everywhere */}
      <label style={{ display: "inline-block", background: S.charcoal, color: S.cream, padding: "10px 24px", cursor: "pointer", ...mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
        Browse Files
        <input type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)}
          style={{ display: "none" }} />
      </label>

      <div style={{ ...mono, fontSize: 11, color: S.brown, marginTop: 8 }}>JPG · PNG · Multiple elevations OK</div>
      <Previews />
    </div>
  );

  // ── Photo upload zone (photo mode) ─────────────────────────
  const PhotoZone = () => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ background: S.warm, border: `1px solid ${S.border}`, padding: "28px 24px", textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🚪</div>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Upload Cabinet Photo</div>

        {/* Two clear buttons: gallery and camera */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: S.charcoal, color: S.cream, padding: "12px 22px", cursor: "pointer", ...mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
            🖼  From Gallery
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => handleFiles(e.target.files)}
              style={{ display: "none" }}
            />
          </label>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, background: S.brown, color: S.cream, padding: "12px 22px", cursor: "pointer", ...mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
            📷  Take Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={e => handleFiles(e.target.files)}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <div style={{ ...mono, fontSize: 11, color: S.brown, marginTop: 12 }}>Include a reference object for better scale accuracy</div>
        <Previews />
      </div>
    </div>
  );

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "Georgia, serif", background: S.cream, minHeight: "100vh", color: S.charcoal }}>
      {/* Header */}
      <div style={{ background: S.charcoal, padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${S.gold}` }}>
        <div style={{ color: S.cream, fontSize: 20, letterSpacing: 1 }}>Cabinet<span style={{ color: S.gold }}>Pricer</span></div>
        <div style={{ background: S.gold, color: S.charcoal, ...mono, fontSize: 10, padding: "4px 12px", letterSpacing: 2, textTransform: "uppercase" }}>AI Powered</div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 20px" }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 6 }}>Kitchen & Cabinet Estimating</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28, lineHeight: 1.2 }}>Upload Layouts or Photos.<br />Get Pricing Instantly.</h1>

        {/* Mode Toggle */}
        <div style={{ display: "flex", marginBottom: 28, border: `1px solid ${S.border}` }}>
          {[["layout", "📐  Layout / Drawings"], ["photo", "📷  Photo Pricing"]].map(([m, lbl], i) => (
            <button key={m} onClick={() => switchMode(m)}
              style={{ flex: 1, padding: "14px", background: mode === m ? S.charcoal : S.warm, color: mode === m ? S.cream : S.charcoal, border: "none", cursor: "pointer", ...mono, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", borderRight: i === 0 ? `1px solid ${S.border}` : "none", transition: "all 0.2s" }}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <div style={{ background: S.redbg, border: `1px solid #d4a0a0`, padding: "12px 16px", marginBottom: 16, ...mono, fontSize: 12, color: S.red }}>{error}</div>}

        {/* ── LAYOUT MODE ── */}
        {mode === "layout" && (
          <>
            <DropZone />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <Sel lbl="Cabinet Grade" val={grade} set={setGrade} opts={GRADES} />
              <Sel lbl="Box Material" val={box} set={setBox} opts={BOX_TYPES} />
              <Sel lbl="Door Style" val={door} set={setDoor} opts={DOOR_STYLES} />
              <Sel lbl="Finish" val={finish} set={setFinish} opts={FINISHES} />
              <Sel lbl="Hardware" val={hardware} set={setHardware} opts={HARDWARE} />
              <Num lbl="Target Sale Price ($)" val={targetPrice} set={setTargetPrice} ph="e.g. 40000" />
            </div>
            <Btn onClick={analyzeLayout} label="Analyze Layout & Price" />

            {results && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingBottom: 14, borderBottom: `2px solid ${S.charcoal}` }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>Pricing Breakdown</div>
                  <div style={{ background: S.gold, color: S.charcoal, padding: "8px 20px", fontSize: 20, fontWeight: 700 }}>{fmt(results.grandTotal)}</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                  {(results.specs || []).map(s => <span key={s} style={{ background: S.charcoal, color: S.cream, ...mono, fontSize: 10, padding: "4px 12px", letterSpacing: 1, textTransform: "uppercase" }}>{s}</span>)}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, ...mono, fontSize: 12 }}>
                  <TH cols={["Wall / Section", "Lin Ft", "Uppers", "Lowers", "Total", "$/LF"]} />
                  <tbody>
                    {results.walls.map((w, i) => (
                      <tr key={i}>
                        <td style={cell(false)}>{w.name}</td>
                        <td style={cell(true)}>{fmtLF(w.totalLF)}</td>
                        <td style={cell(true)}>{fmt(w.upperCost)}</td>
                        <td style={cell(true)}>{fmt(w.lowerCost)}</td>
                        <td style={cell(true)}>{fmt(w.totalCost)}</td>
                        <td style={cell(true)}>{fmt(w.costPerLF)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={totalCell(false)}>TOTAL</td>
                      <td style={totalCell(true)}>{fmtLF(results.totalLF)} LF</td>
                      <td style={totalCell(true)}>{fmt(results.totalUpperCost)}</td>
                      <td style={totalCell(true)}>{fmt(results.totalLowerCost)}</td>
                      <td style={totalCell(true)}>{fmt(results.grandTotal)}</td>
                      <td style={totalCell(true)}>{fmt(results.blendedCostPerLF)}/LF</td>
                    </tr>
                  </tbody>
                </table>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, ...mono, fontSize: 12 }}>
                  <thead><tr>{["Summary", "LF", "$/LF", "Total"].map((h, i) => <th key={h} style={{ background: S.brown, color: S.cream, padding: "10px 14px", textAlign: i === 0 ? "left" : "right", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 400 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    <tr><td style={cell(false)}>Upper Cabinets</td><td style={cell(true)}>{fmtLF(results.totalUpperLF)}</td><td style={cell(true)}>{fmt(results.upperCostPerLF)}/LF</td><td style={cell(true)}>{fmt(results.totalUpperCost)}</td></tr>
                    <tr><td style={cell(false)}>Lower Cabinets</td><td style={cell(true)}>{fmtLF(results.totalLowerLF)}</td><td style={cell(true)}>{fmt(results.lowerCostPerLF)}/LF</td><td style={cell(true)}>{fmt(results.totalLowerCost)}</td></tr>
                    <tr><td style={totalCell(false)}>Grand Total</td><td style={totalCell(true)}>{fmtLF(results.totalLF)} LF</td><td style={totalCell(true)}>{fmt(results.blendedCostPerLF)}/LF</td><td style={totalCell(true)}>{fmt(results.grandTotal)}</td></tr>
                  </tbody>
                </table>
                <div style={{ background: S.warm, borderLeft: `3px solid ${S.gold}`, padding: "16px 20px" }}>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 8 }}>AI Analysis Notes</div>
                  <p style={{ ...mono, fontSize: 12, lineHeight: 1.8 }}>{results.notes}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PHOTO MODE ── */}
        {mode === "photo" && (
          <>
            <div style={{ background: S.warm, borderLeft: `3px solid ${S.gold}`, padding: "14px 18px", marginBottom: 20, ...mono, fontSize: 12, lineHeight: 1.7 }}>
              📸 <strong>Photo Pricing</strong> — Upload or take a photo of cabinets. AI identifies style, estimates linear footage, and prices to your specs.
            </div>
            <PhotoZone />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <Num lbl="Estimated Width (inches, optional)" val={roomWidth} set={setRoomWidth} ph="e.g. 120" />
              <Num lbl="Target Sale Price ($, optional)" val={targetPrice} set={setTargetPrice} ph="e.g. 40000" />
              <Sel lbl="Quote Grade" val={grade} set={setGrade} opts={GRADES} />
              <Sel lbl="Box Material" val={box} set={setBox} opts={BOX_TYPES} />
              <Sel lbl="Door Style" val={door} set={setDoor} opts={DOOR_STYLES} />
              <Sel lbl="Finish" val={finish} set={setFinish} opts={FINISHES} />
              <Sel lbl="Hardware" val={hardware} set={setHardware} opts={HARDWARE} />
            </div>
            <Btn onClick={analyzePhoto} label="Analyze Photo & Price" />

            {photoResults && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, paddingBottom: 14, borderBottom: `2px solid ${S.charcoal}` }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>Photo Analysis</div>
                  <div style={{ background: S.gold, color: S.charcoal, padding: "8px 20px", fontSize: 20, fontWeight: 700 }}>{fmt(photoResults.grandTotal)}</div>
                </div>
                <div style={{ background: S.warm, border: `1px solid ${S.border}`, padding: "12px 18px", marginBottom: 20, ...mono, fontSize: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: S.brown, letterSpacing: 1, textTransform: "uppercase", fontSize: 10 }}>Confidence:</span>
                  <strong style={{ color: confidenceColor(photoResults.confidence) }}>{photoResults.confidence}</strong>
                  <span style={{ color: S.brown }}>— {photoResults.confidenceReason}</span>
                </div>
                <div style={{ background: S.warm, borderLeft: `3px solid ${S.charcoal}`, padding: "16px 20px", marginBottom: 20 }}>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 10 }}>What AI Detected</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, ...mono, fontSize: 12 }}>
                    <div><span style={{ color: S.brown }}>Style: </span>{photoResults.detectedStyle}</div>
                    <div><span style={{ color: S.brown }}>Finish: </span>{photoResults.detectedFinish}</div>
                    <div><span style={{ color: S.brown }}>Door: </span>{photoResults.detectedDoorStyle}</div>
                    <div><span style={{ color: S.brown }}>Condition: </span>{photoResults.condition}</div>
                  </div>
                  {photoResults.specialFeatures?.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {photoResults.specialFeatures.map(f => <span key={f} style={{ background: S.charcoal, color: S.cream, ...mono, fontSize: 10, padding: "3px 10px", letterSpacing: 1, textTransform: "uppercase" }}>{f}</span>)}
                    </div>
                  )}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, ...mono, fontSize: 12 }}>
                  <TH cols={["Cabinet Type", "Est. LF", "$/LF", "Total"]} />
                  <tbody>
                    <tr><td style={cell(false)}>Upper Cabinets</td><td style={cell(true)}>{fmtLF(photoResults.estimatedUpperLF)}</td><td style={cell(true)}>{fmt(photoResults.upperCostPerLF)}/LF</td><td style={cell(true)}>{fmt(photoResults.upperCost)}</td></tr>
                    <tr><td style={cell(false)}>Lower Cabinets</td><td style={cell(true)}>{fmtLF(photoResults.estimatedLowerLF)}</td><td style={cell(true)}>{fmt(photoResults.lowerCostPerLF)}/LF</td><td style={cell(true)}>{fmt(photoResults.lowerCost)}</td></tr>
                    <tr><td style={totalCell(false)}>Total</td><td style={totalCell(true)}>{fmtLF(photoResults.estimatedTotalLF)} LF</td><td style={totalCell(true)}>{fmt(photoResults.blendedCostPerLF)}/LF</td><td style={totalCell(true)}>{fmt(photoResults.grandTotal)}</td></tr>
                  </tbody>
                </table>
                {photoResults.recommendations?.length > 0 && (
                  <div style={{ background: S.warm, borderLeft: `3px solid ${S.gold}`, padding: "16px 20px", marginBottom: 20 }}>
                    <div style={{ ...mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 10 }}>Recommendations</div>
                    <ul style={{ ...mono, fontSize: 12, lineHeight: 2, paddingLeft: 16 }}>
                      {photoResults.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                <div style={{ background: S.warm, borderLeft: `3px solid ${S.gold}`, padding: "16px 20px" }}>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 8 }}>AI Notes</div>
                  <p style={{ ...mono, fontSize: 12, lineHeight: 1.8 }}>{photoResults.notes}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
