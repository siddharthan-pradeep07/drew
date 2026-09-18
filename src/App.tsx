import { useState } from "react";
import type { PageConfig } from "./types";
import SetupScreen from "./components/SetupScreen";
import CanvasScreen from "./components/CanvasScreen";

function App() {
  const [pageConfig, setPageConfig] = useState<PageConfig | null>(null);

  if (pageConfig) {
    return <CanvasScreen pageConfig={pageConfig} onBack={() => setPageConfig(null)} />;
  }

  return <SetupScreen onStart={setPageConfig} />;
}

export default App;
{
  
}