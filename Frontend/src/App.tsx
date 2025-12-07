import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Login, Register, Game, ProtectedRoute } from "./components";
import "./App.css";
import { store } from "./store";
import { Provider } from "react-redux";

function App() {
  return (
    <Provider store={store}>
      <div id="root">
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Register />} />
            <Route
              path="/game"
              element={
                <ProtectedRoute>
                  <Game />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </div>
    </Provider>
  );
}

export default App;
