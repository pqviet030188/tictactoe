import { useDispatch } from "react-redux";
import { fetchUser, useAppSelector } from "./store";

function App() {
   const dispatch = useDispatch();
  const { currentUser, loading, error } = useAppSelector((state) => state.user);

  return (
    <div>
      <button onClick={() => dispatch(fetchUser())}>Load User</button>

      {loading && <p>Loading…</p>}
      {error && <p>Error: {error}</p>}
      {currentUser && <pre>{JSON.stringify(currentUser, null, 2)}</pre>}
    </div>
  );  
}

export default App;
