import * as signalR from "@microsoft/signalr";
import config from "../appConfig";

export const lobbyHub = new signalR.HubConnectionBuilder()
  .withUrl(`${config.apiBaseUrl}/lobby`, {})
  .withAutomaticReconnect()
  .build();
