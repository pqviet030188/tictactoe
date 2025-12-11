import * as signalR from "@microsoft/signalr";
import config from "../appConfig";

export const roomHub = new signalR.HubConnectionBuilder()
  .withUrl(`${config.apiBaseUrl}/room`, {})
  .withAutomaticReconnect()
  .build();
