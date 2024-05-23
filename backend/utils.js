import { broadcast } from "./websockets.js";

export const formatMessage = (content, role, chunk = false, timestamp = new Date().toISOString) => {
    if (chunk) {
      return JSON.stringify({ content, role, chunk, timestamp });
    } else {
      return JSON.stringify({ content, role, chunk: undefined, timestamp});
    }
  };
  
  export const sendJsonMessage = (content, role, chunk = false, clientId=undefined, timestamp=new Date().toISOString()) => {
    console.log("Sending message to all clients: ", content, role, chunk);
    const jsonString = formatMessage(content, role, chunk, timestamp);
    //ws.send(jsonString);
    broadcast(jsonString, clientId);
  };
  