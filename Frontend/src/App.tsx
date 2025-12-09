import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  Solo,
  Login,
  Register,
  Game,
  ProtectedRoute,
  Lobby,
  CMatch,
} from "./components";
import { store } from "./store";
import { Provider } from "react-redux";

import "./App.css";

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
            <Route
              path="/solo"
              element={
                <ProtectedRoute>
                  <Solo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lobby"
              element={
                <ProtectedRoute>
                  <Lobby />
                </ProtectedRoute>
              }
            />
            <Route
              path="/match"
              element={
                <ProtectedRoute>
                  <CMatch />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </div>
    </Provider>
  );
}

export default App;
