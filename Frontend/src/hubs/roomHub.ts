import * as signalR from "@microsoft/signalr";
import config from "../config";

export const roomHub = new signalR.HubConnectionBuilder()
  .withUrl(`${config.apiBaseUrl}/room`, {})
  .withAutomaticReconnect()
  .build();
