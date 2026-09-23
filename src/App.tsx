import { useState } from "react";
import type { DrewElement, PageConfig } from "./types";
import { clearDocument, loadDocument } from "./lib/storage";
import SetupScreen from "./components/SetupScreen";
import CanvasScreen from "./components/CanvasScreen";

function App() {
  const [pageConfig, setPageConfig] = useState<PageConfig | null>(null);
  const [initialElements, setInitialElements] = useState<DrewElement[]>([]);
  const [savedDocument, setSavedDocument] = useState(() => loadDocument());

  if (pageConfig) {
    return (
      <CanvasScreen
        pageConfig={pageConfig}
        initialElements={initialElements}
        onBack={() => {
          setPageConfig(null);
          setSavedDocument(loadDocument());
        }}
      />
    );
  }

  return (
    <SetupScreen
      savedDocument={savedDocument}
      onDiscardSaved={() => {
        clearDocument();
        setSavedDocument(null);
      }}
      onStart={(config, elements) => {
        setInitialElements(elements ?? []);
        setPageConfig(config);
      }}
    />
  );
}

export default App;
