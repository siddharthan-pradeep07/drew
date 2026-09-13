import { useState, useMemo } from "react";
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
import "./App.css";

const SAMPLE_SIZES = [
  {label: "A4 (Portrait)", width: 210, height: 297, unit: "mm"},
  {label: "A4 (Landscape)", width: 297, height: 210, unit: "mm"},
  {label: "US Letter", width: 8.5, height: 11, unit: "in"},
  {label: "Square Social", width: 1080, height: 1080, unit: "px"},
  {label: "story / reel", width: 1080, height: 1920, unit: "px"},
  {label: "Desktop 16:9", width: 1920, height: 1080, unit: "px"},
];

function App() 
{
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [unit, setUnit] = useState("px");

  const ratio = useMemo(() =>
  {
    if (!width || !height) return 0;
    return width / height;
  }, [width, height]);

  const previewBase = 160;

  const previews = useMemo(() =>
  {
    return SAMPLE_SIZES.map((s) =>
    {
      const r = s.width / s.height;
      let w = previewBase;
      let h = w / r;
      if (h > previewBase)
      {
        h = previewBase;
        w = h * r;
      }
      return { ...s, previewWidth: w, previewHeight: h };
    });
  }, []);

  const mainPreview = useMemo(() =>
  {
    const r = ratio || 1;
    let w = 200;
    let h = w / r;
    if (h > 200)
    {
      h = 200;
      w = h * r;
    }
    return { width: w, height: h };
  }, [ratio]);

  return (
    <div className="app">
      <header className="header">
        <h1>new page</h1>
        <p className="subtitle">
          Create a new page blah blah with custom size, this thext is temperory and will chaneg lorem ipsun halo ich bin siddharthan
        </p>
      </header>

      <section className="custom-size">
        <h2>custom saiz</h2>
        <div className="size-inputs">
          <label>
            width
            <input
              type="number"
              min={1}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value) || 0)}
            />
          </label>

          <label>
            height
            <input
              type="number"
              min={1}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || 0)}
            />
          </label>

          <label>
            unit
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="px">px</option>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </label>
        </div>

        <div className="main-preview">
          <div className="preview-box main"
            style=
            {{
              width: `${mainPreview.width}px`,
              height: `${mainPreview.height}px`,
            }}
            title={`${width}${unit} x ${height}${unit} (ratio ${ratio.toFixed(2)})`}
          />
          <div className="preview-label">
            {width}{unit} x {height}{unit}
          </div>
        </div>
      </section>

      <section className="samples">
        <h2>sample sizes</h2>
        <p className="samples-intro">
          do something selct something blah balh balk bark barp larp
        </p>

        <div className="sample-grid">
          {previews.map((s) => 
          (
            <button
              key={s.label}
              className="sample-card"
              onClick={() =>
              {
                setWidth(s.width);
                setHeight(s.height);
                setUnit(s.unit);
              }}
              title={`${s.width} ${s.unit} × ${s.height} ${s.unit}`}>
                <div className="preview-box"
                  style=
                  {{
                    width: `${s.previewWidth}px`,
                    height: `${s.previewHeight}px`,
                  }}
                />
                <div className="sample-label">{s.label}</div>
                <div className="sample-dims">{s.width} {s.unit} × {s.height} {s.unit}</div>
            </button>
          ))}
        </div>
      </section>
    </div>  
  );
}  

export default App;