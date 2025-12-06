import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

function Chat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [connection, setConnection] = useState<any>(null);

  useEffect(() => {
    const connect = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5000/match", {
        withCredentials: false
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
      await connection.invoke("SendMessage", user, message);
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
