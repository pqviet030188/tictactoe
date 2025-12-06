import { useDispatch } from "react-redux";
import { fetchUser, useAppSelector } from "./store";

function App() {
   const dispatch = useDispatch();
  const { data, loading, error } = useAppSelector((state) => state.user);

  return (
    <div>
      <button onClick={() => dispatch(fetchUser())}>Load User</button>

      {loading && <p>Loading…</p>}
      {error && <p>Error: {error}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );  
}

export default App;
