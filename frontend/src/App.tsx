import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import InscriptionPage from "./pages/InscriptionPage";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/inscription" element={<InscriptionPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
