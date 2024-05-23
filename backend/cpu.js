import os from "os-utils";

export const startCpuWebSocket = (wsRouter) => {
  wsRouter.all("/cpu", (ctx) => {
    console.log("CPU WebSocket connection established");

    const sendCpuUsage = () => {
      os.cpuUsage((v) => {
        const cpuUsage = (v * 100).toFixed(2);
        console.log("CPU Usage: " + cpuUsage + "%");
        ctx.websocket.send(cpuUsage);
      });
    };

    sendCpuUsage();
    const cpuInterval = setInterval(sendCpuUsage, 6000);

    ctx.websocket.on("close", () => {
      clearInterval(cpuInterval);
      console.log("CPU WebSocket connection closed");
    });
  });
};
