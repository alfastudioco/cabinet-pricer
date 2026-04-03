import { useState, useCallback } from "react";

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
const lSt = { fontFamily: "monospace", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 6 };
const cell = (r) => ({ padding: "10px 14px", background: S.warm, borderBottom: `1px solid ${S.border}`, textAlign: r ? "right" : "left" });
const tot = (r) => ({ padding: "10px 14px", background: S.light, fontWeight: 700, textAlign: r ? "right" : "left" });

export default function App() {
  const [mode, setMode] = useState("layout");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [grade, setGrade] = useState("Semi-Custom");
  const [box, setBox] = useState("Plywood");
  const [door, setDoor] = useState("Inset");
  const [finish, setFinish] = useState("Painted");
  const [hardware, setHardware] = useState("Blum Soft Close");
  const [price, setPrice] = useState("");
  const [width, setWidth] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [photoRes, setPhotoRes] = useState(null);
  const [error, setError] = useState("");

  const switchMode = (m) => {
    setMode(m); setFiles([]); setPreviews([]);
    setResults(null); setPhotoRes(null); setError("");
  };

  const handleFiles = useCallback((newFiles) => {
    Array.from(newFiles).forEach(file => {
      if (!file.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = e => {
        const src = e.target.result;
        setPreviews(p => [...p, { src }]);
        setFiles(f => [...f, { b64: src.split(",")[1], type: file.type }]);
      };
      r.readAsDataURL(file);
    });
  }, []);

  const removeFile = (i) => {
    setFiles(f => f.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const fmt = n => "$" + Math.round(n).toLocaleString();
  const fmtLF = n => parseFloat(n).toFixed(1);

  const callAPI = async (blocks) => {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: blocks }]
      })
    });
    const data = await res.json();
    const text = data.content.map(i => i.text || "").join("");
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  };

  const analyzeLayout = async () => {
    if (!files.length) { setError("Upload at least one drawing."); return; }
    setError(""); setLoading(true); setResults(null);
    try {
      const blocks = [
        ...files.map(f => ({ type: "image", source: { type: "base64", media_type: f.type, data: f.b64 } })),
        {
          type: "text",
          text: `Expert cabinet estimator. Analyze elevation drawings. Grade:${grade}, Box:${box}, Door:${door}, Finish:${finish}, Hardware:${hardware}. ${price ? `Sale price $${parseInt(price).toLocaleString()} — use this exact total.` : "Estimate fair market price."} Extract LF per wall, split upper/lower lowers 60% uppers 40%. Respond ONLY valid JSON no markdown: {"walls":[{"name":"str","totalLF":0.0,"upperLF":0.0,"lowerLF":0.0,"upperCost":0,"lowerCost":0,"totalCost":0,"costPerLF":0,"features":["str"]}],"totalLF":0.0,"totalUpperLF":0.0,"totalLowerLF":0.0,"totalUpperCost":0,"totalLowerCost":0,"grandTotal":0,"upperCostPerLF":0,"lowerCostPerLF":0,"blendedCostPerLF":0,"specs":["str"],"notes":"str"}`
        }
      ];
      setResults(await callAPI(blocks));
    } catch (e) { setError("Failed: " + e.message); }
    finally { setLoading(false); }
  };

  const analyzePhoto = async () => {
    if (!files.length) { setError("Upload at least one photo."); return; }
    setError(""); setLoading(true); setPhotoRes(null);
    try {
      const blocks = [
        ...files.map(f => ({ type: "image", source: { type: "base64", media_type: f.type, data: f.b64 } })),
        {
          type: "text",
          text: `Expert cabinet estimator 20yrs. Analyze cabinet photos. ${width ? `Width ~${width}in.` : ""} ${price ? `Target $${parseInt(price).toLocaleString()}.` : "Estimate fair market."} Customer wants: Grade:${grade}, Box:${box}, Door:${door}, Finish:${finish}, Hardware:${hardware}. Identify style/finish/door, estimate LF uppers+lowers, note features+condition. Lowers 60% cost uppers 40%. Respond ONLY valid JSON no markdown: {"detectedStyle":"str","detectedFinish":"str","detectedDoorStyle":"str","specialFeatures":["str"],"condition":"str","estimatedUpperLF":0.0,"estimatedLowerLF":0.0,"estimatedTotalLF":0.0,"upperCost":0,"lowerCost":0,"grandTotal":0,"upperCostPerLF":0,"lowerCostPerLF":0,"blendedCostPerLF":0,"confidence":"Low/Medium/High","confidenceReason":"str","recommendations":["str"],"notes":"str"}`
        }
      ];
      setPhotoRes(await callAPI(blocks));
    } catch (e) { setError("Failed: " + e.message); }
    finally { setLoading(false); }
  };

  const Sel = ({ lbl, val, set, opts }) => (
    <div>
      <div style={lSt}>{lbl}</div>
      <select value={val} onChange={e => set(e.target.value)}
        style={{ width: "100%", background: S.warm, border: `1px solid ${S.border}`, padding: "10px 14px", ...mono, fontSize: 13, color: S.charcoal, outline: "none" }}>
        {opts.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );

  const Num = ({ lbl, val, set, ph }) => (
    <div>
      <div style={lSt}>{lbl}</div>
      <input type="number" placeholder={ph} value={val} onChange={e => set(e.target.value)}
        style={{ width: "100%", background: S.warm, border: `1px solid ${S.border}`, padding: "10px 14px", ...mono, fontSize: 13, color: S.charcoal, outline: "none" }} />
    </div>
  );

  const TH = ({ cols }) => (
    <thead>
      <tr>
        {cols.map((h, i) => (
          <th key={h} style={{ background: S.charcoal, color: S.cream, padding: "10px 14px", textAlign: i === 0 ? "left" : "right", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
        ))}
      </tr>
    </thead>
  );

  const Previews = () => previews.length > 0 ? (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, justifyContent: "center" }}>
      {previews.map((p, i) => (
        <div key={i} style={{ position: "relative", width: 70, height: 70, border: `1px solid ${S.border}`, overflow: "hidden" }}>
          <img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <button onClick={() => removeFile(i)}
            style={{ position: "absolute", top: 2, right: 2, background: S.charcoal, color: "white", border: "none", width: 18, height: 18, cursor: "pointer", fontSize: 12 }}>×</button>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div style={{ fontFamily: "Georgia, serif", background: S.cream, minHeight: "100vh", color: S.charcoal }}>

      {/* Header */}
      <div style={{ background: S.charcoal, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${S.gold}` }}>
        <div style={{ color: S.cream, fontSize: 20 }}>Cabinet<span style={{ color: S.gold }}>Pricer</span></div>
        <div style={{ background: S.gold, color: S.charcoal, ...mono, fontSize: 10, padding: "4px 10px", letterSpacing: 2, textTransform: "uppercase" }}>AI Powered</div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Cabinet Estimating Tool</h1>

        {/* Mode Toggle */}
        <div style={{ display: "flex", marginBottom: 24, border: `1px solid ${S.border}` }}>
          {[["layout", "📐  Layout / Drawings"], ["photo", "📷  Photo Pricing"]].map(([m, lbl], i) => (
            <button key={m} onClick={() => switchMode(m)}
              style={{ flex: 1, padding: "13px", background: mode === m ? S.charcoal : S.warm, color: mode === m ? S.cream : S.charcoal, border: "none", cursor: "pointer", ...mono, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", borderRight: i === 0 ? `1px solid ${S.border}` : "none", transition: "all 0.2s" }}>
              {lbl}
            </button>
          ))}
        </div>

        {error && <div style={{ background: S.redbg, border: `1px solid #d4a0a0`, padding: "12px 16px", marginBottom: 16, ...mono, fontSize: 12, color: S.red }}>{error}</div>}

        {/* ── LAYOUT MODE ── */}
        {mode === "layout" && <>
          <div style={{ border: `2px dashed ${S.border}`, background: S.warm, padding: "28px", textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📐</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Upload Elevation Drawings</div>
            <label style={{ display: "inline-block", background: S.charcoal, color: S.cream, padding: "10px 22px", cursor: "pointer", ...mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
              Browse Files
              <input type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} style={{ display: "none" }} />
            </label>
            <div style={{ ...mono, fontSize: 11, color: S.brown, marginTop: 8 }}>JPG · PNG · Multiple elevations OK</div>
            <Previews />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Sel lbl="Cabinet Grade" val={grade} set={setGrade} opts={GRADES} />
            <Sel lbl="Box Material" val={box} set={setBox} opts={BOX_TYPES} />
            <Sel lbl="Door Style" val={door} set={setDoor} opts={DOOR_STYLES} />
            <Sel lbl="Finish" val={finish} set={setFinish} opts={FINISHES} />
            <Sel lbl="Hardware" val={hardware} set={setHardware} opts={HARDWARE} />
            <Num lbl="Target Sale Price ($)" val={price} set={setPrice} ph="e.g. 40000" />
          </div>

          <button onClick={analyzeLayout} disabled={loading}
            style={{ width: "100%", background: loading ? S.brown : S.charcoal, color: S.cream, border: "none", padding: 16, ...mono, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", marginBottom: 28 }}>
            {loading ? "⏳  Analyzing..." : "Analyze Layout & Price"}
          </button>

          {results && <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${S.charcoal}` }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Pricing Breakdown</div>
              <div style={{ background: S.gold, color: S.charcoal, padding: "8px 18px", fontSize: 18, fontWeight: 700 }}>{fmt(results.grandTotal)}</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {(results.specs || []).map(s => <span key={s} style={{ background: S.charcoal, color: S.cream, ...mono, fontSize: 10, padding: "3px 10px", letterSpacing: 1, textTransform: "uppercase" }}>{s}</span>)}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, ...mono, fontSize: 12 }}>
              <TH cols={["Wall", "Lin Ft", "Uppers", "Lowers", "Total", "$/LF"]} />
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
                  <td style={tot(false)}>TOTAL</td>
                  <td style={tot(true)}>{fmtLF(results.totalLF)} LF</td>
                  <td style={tot(true)}>{fmt(results.totalUpperCost)}</td>
                  <td style={tot(true)}>{fmt(results.totalLowerCost)}</td>
                  <td style={tot(true)}>{fmt(results.grandTotal)}</td>
                  <td style={tot(true)}>{fmt(results.blendedCostPerLF)}/LF</td>
                </tr>
              </tbody>
            </table>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, ...mono, fontSize: 12 }}>
              <thead>
                <tr>{["Summary", "LF", "$/LF", "Total"].map((h, i) => (
                  <th key={h} style={{ background: S.brown, color: S.cream, padding: "10px 14px", textAlign: i === 0 ? "left" : "right", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 400 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                <tr><td style={cell(false)}>Uppers</td><td style={cell(true)}>{fmtLF(results.totalUpperLF)}</td><td style={cell(true)}>{fmt(results.upperCostPerLF)}/LF</td><td style={cell(true)}>{fmt(results.totalUpperCost)}</td></tr>
                <tr><td style={cell(false)}>Lowers</td><td style={cell(true)}>{fmtLF(results.totalLowerLF)}</td><td style={cell(true)}>{fmt(results.lowerCostPerLF)}/LF</td><td style={cell(true)}>{fmt(results.totalLowerCost)}</td></tr>
                <tr><td style={tot(false)}>Grand Total</td><td style={tot(true)}>{fmtLF(results.totalLF)} LF</td><td style={tot(true)}>{fmt(results.blendedCostPerLF)}/LF</td><td style={tot(true)}>{fmt(results.grandTotal)}</td></tr>
              </tbody>
            </table>
            <div style={{ background: S.warm, borderLeft: `3px solid ${S.gold}`, padding: "14px 18px" }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 8 }}>AI Notes</div>
              <p style={{ ...mono, fontSize: 12, lineHeight: 1.8 }}>{results.notes}</p>
            </div>
          </>}
        </>}

        {/* ── PHOTO MODE ── */}
        {mode === "photo" && <>
          <div style={{ background: S.warm, borderLeft: `3px solid ${S.gold}`, padding: "12px 16px", marginBottom: 16, ...mono, fontSize: 12, lineHeight: 1.7 }}>
            📸 Upload or take a photo of cabinets. AI identifies style, estimates LF, and prices to your specs.
          </div>

          <div style={{ background: S.warm, border: `1px solid ${S.border}`, padding: "28px", textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🚪</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Upload Cabinet Photo</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: S.charcoal, color: S.cream, padding: "12px 20px", cursor: "pointer", ...mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
                🖼  Gallery
                <input type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} style={{ display: "none" }} />
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: S.brown, color: S.cream, padding: "12px 20px", cursor: "pointer", ...mono, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
                📷  Camera
                <input type="file" accept="image/*" capture="environment" onChange={e => handleFiles(e.target.files)} style={{ display: "none" }} />
              </label>
            </div>
            <div style={{ ...mono, fontSize: 11, color: S.brown, marginTop: 10 }}>Include a reference object for better scale accuracy</div>
            <Previews />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Num lbl="Est. Width (inches, optional)" val={width} set={setWidth} ph="e.g. 120" />
            <Num lbl="Target Sale Price ($)" val={price} set={setPrice} ph="e.g. 40000" />
            <Sel lbl="Quote Grade" val={grade} set={setGrade} opts={GRADES} />
            <Sel lbl="Box Material" val={box} set={setBox} opts={BOX_TYPES} />
            <Sel lbl="Door Style" val={door} set={setDoor} opts={DOOR_STYLES} />
            <Sel lbl="Finish" val={finish} set={setFinish} opts={FINISHES} />
            <Sel lbl="Hardware" val={hardware} set={setHardware} opts={HARDWARE} />
          </div>

          <button onClick={analyzePhoto} disabled={loading}
            style={{ width: "100%", background: loading ? S.brown : S.charcoal, color: S.cream, border: "none", padding: 16, ...mono, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", marginBottom: 28 }}>
            {loading ? "⏳  Analyzing..." : "Analyze Photo & Price"}
          </button>

          {photoRes && <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: `2px solid ${S.charcoal}` }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Photo Analysis</div>
              <div style={{ background: S.gold, color: S.charcoal, padding: "8px 18px", fontSize: 18, fontWeight: 700 }}>{fmt(photoRes.grandTotal)}</div>
            </div>
            <div style={{ background: S.warm, border: `1px solid ${S.border}`, padding: "10px 16px", marginBottom: 16, ...mono, fontSize: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: S.brown, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" }}>Confidence:</span>
              <strong style={{ color: photoRes.confidence === "High" ? "#4a7c59" : photoRes.confidence === "Medium" ? S.gold : S.red }}>{photoRes.confidence}</strong>
              <span style={{ color: S.brown }}>— {photoRes.confidenceReason}</span>
            </div>
            <div style={{ background: S.warm, borderLeft: `3px solid ${S.charcoal}`, padding: "14px 18px", marginBottom: 16 }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 10 }}>What AI Detected</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, ...mono, fontSize: 12 }}>
                <div><span style={{ color: S.brown }}>Style: </span>{photoRes.detectedStyle}</div>
                <div><span style={{ color: S.brown }}>Finish: </span>{photoRes.detectedFinish}</div>
                <div><span style={{ color: S.brown }}>Door: </span>{photoRes.detectedDoorStyle}</div>
                <div><span style={{ color: S.brown }}>Condition: </span>{photoRes.condition}</div>
              </div>
              {photoRes.specialFeatures?.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {photoRes.specialFeatures.map(f => <span key={f} style={{ background: S.charcoal, color: S.cream, ...mono, fontSize: 10, padding: "3px 10px", letterSpacing: 1, textTransform: "uppercase" }}>{f}</span>)}
                </div>
              )}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, ...mono, fontSize: 12 }}>
              <TH cols={["Cabinet Type", "Est. LF", "$/LF", "Total"]} />
              <tbody>
                <tr><td style={cell(false)}>Upper Cabinets</td><td style={cell(true)}>{fmtLF(photoRes.estimatedUpperLF)}</td><td style={cell(true)}>{fmt(photoRes.upperCostPerLF)}/LF</td><td style={cell(true)}>{fmt(photoRes.upperCost)}</td></tr>
                <tr><td style={cell(false)}>Lower Cabinets</td><td style={cell(true)}>{fmtLF(photoRes.estimatedLowerLF)}</td><td style={cell(true)}>{fmt(photoRes.lowerCostPerLF)}/LF</td><td style={cell(true)}>{fmt(photoRes.lowerCost)}</td></tr>
                <tr><td style={tot(false)}>Total</td><td style={tot(true)}>{fmtLF(photoRes.estimatedTotalLF)} LF</td><td style={tot(true)}>{fmt(photoRes.blendedCostPerLF)}/LF</td><td style={tot(true)}>{fmt(photoRes.grandTotal)}</td></tr>
              </tbody>
            </table>
            {photoRes.recommendations?.length > 0 && (
              <div style={{ background: S.warm, borderLeft: `3px solid ${S.gold}`, padding: "14px 18px", marginBottom: 16 }}>
                <div style={{ ...mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 8 }}>Recommendations</div>
                <ul style={{ ...mono, fontSize: 12, lineHeight: 2, paddingLeft: 16 }}>
                  {photoRes.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            <div style={{ background: S.warm, borderLeft: `3px solid ${S.gold}`, padding: "14px 18px" }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: S.brown, marginBottom: 8 }}>AI Notes</div>
              <p style={{ ...mono, fontSize: 12, lineHeight: 1.8 }}>{photoRes.notes}</p>
            </div>
          </>}
        </>}
      </div>
    </div>
  );
}
