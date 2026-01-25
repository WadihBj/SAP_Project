import { BrowserRouter, Routes, Route } from "react-router-dom";
import AssistantDashboard from "./pages/AssistantDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AssistantDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
