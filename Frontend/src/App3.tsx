import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [connection, setConnection] = useState<any>(null);

  useEffect(() => {
    const connect = new signalR.HubConnectionBuilder()
      //.withUrl("http://localhost:5000/lobby", {
      .withUrl("http://localhost:5101/lobby", {
        //withCredentials: false,
         // accessTokenFactory: () => `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiI2OTM0MWM2NjAyNGQ5YWRkZWZmMjU4OGMiLCJlbWFpbCI6InBxdmlldDAzMDE4OEBnbWFpbC5jb20iLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJuYmYiOjE3NjUwMjMxNzIsImV4cCI6MTc2NTA0MTE3MiwiaWF0IjoxNzY1MDIzMTcyLCJpc3MiOiJUaWN0YWN0b2VJc3N1ZXJEZXYiLCJhdWQiOiJUaWN0YWN0b2VBdWRpZW5jZURldiJ9.w-rZj_8zspj8Ch4ZwPjobLovxDWaHJWRS9x0C4W-YqA`
      }) 
      .withAutomaticReconnect()
      .build();

    connect
      .start()
      .then(() => console.log("Connected to SignalR"))
      .catch((err) => console.error(err));

    connect.on("ReceiveMessage", (user, message) => {
      setMessages((prev) => [...prev, { user, message }]);
    });

    setConnection(connect);

    return () => {
      connect.stop();
    };
  }, []);

  const sendMessage = async (user: any, message: any) => {
    if (connection) {
      // const result = await connection.invoke("IDK", user, message);
      // console.log(result);

      const lb = await connection.invoke("JoinLobby");
      console.log(lb);
    }
  };

  return (
    <div>
      <h1>Chat</h1>
      <ul>
        {messages.map((m, i) => (
          <li key={i}>
            {m.user}: {m.message}
          </li>
        ))}
      </ul>
      <button onClick={() => sendMessage("Me", "Hello!")}>Send Hello</button>
    </div>
  );
}

export default Chat;
