import Koa from "koa";
import Router from "koa-router";
import koaStatic from "koa-static";
import websockify from "koa-websocket";
import fs from "fs";
import { wsRouter } from "./backend/websockets.js";
import {
  dbPromise,
  dbPromiseMemory,
  dbPromisePrompts,
  dbVersions,
  initDb,
  setMessageVersion,
} from "./backend/db.js";
import { startCpuWebSocket } from "./backend/cpu.js";
import { FROGOT_ABOUT_YOU_PROBABILITY, PREFORMANCE_MODE_NO_CONSOLE_LOG, REMEMBER_ABOUT_YOU_PROBABILITY, getRandomPrompt } from "./backend/constants.js";
import { getApiContextDebug, invokeApi } from "./backend/api.js";
import bodyParser from "koa-bodyparser";
import { setupRoutes } from "./backend/routes.js";

const silentifyConsole = () => {
  console.log("Silencing console for better performance...");
  console.log = () => {};
  //console.error = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.trace = () => {};
};

if (PREFORMANCE_MODE_NO_CONSOLE_LOG){
  setTimeout(()=>silentifyConsole(), 7*1000);
}

const app = websockify(new Koa());
const router = new Router();
// Usa bodyparser per analizzare il corpo della richiesta JSON
app.use(bodyParser());

initDb();

router.get("/", async (ctx) => {
  ctx.type = "html";
  ctx.body = await fs.promises.readFile("./public/index.html", "utf8");
});

app.ws.use(wsRouter.routes()).use(wsRouter.allowedMethods());
startCpuWebSocket(wsRouter);
setupRoutes(router);
app.use(router.routes()).use(router.allowedMethods());
app.use(koaStatic("./public"));

app.listen(3000, "0.0.0.0", () => {
  console.log("Server is running on http://0.0.0.0:3000");
});

let interval = null;
let intervalTimer = null;
let etaIntervalSecs = -1;

export const getEtaIntervalSecs = () => {
  return etaIntervalSecs;
};

export const setToughtloopInterval = (timing = 333) => {
  const radnomAdditionalSecs = Math.floor(Math.random() * 333);
  timing += radnomAdditionalSecs * parseInt(Math.random() * 5);

  clearToughtloopInterval();
  console.log("Setting interval", timing);
  interval = setInterval(async () => {
    const toughloopPrompt = await getRandomPrompt();
    if (!toughloopPrompt) {
      console.log("No toughtloop prompt found");
      return;
    }
    await invokeApi(toughloopPrompt, false);
  }, timing * 1000);
  etaIntervalSecs = timing;
};

intervalTimer = setInterval(async () => {
  etaIntervalSecs--;
  if (etaIntervalSecs < 0) {
    if (getApiContextDebug().invokingApi){
      console.log("I'm writing a message...");
      return;
    }
    console.log("I don't want to write a message", etaIntervalSecs);
  } else {
    console.log("I want to write a message in", etaIntervalSecs, "seconds");
  }
  const forgotToWriteMessageChance = Math.random();
  if (etaIntervalSecs > 0) {
    if (forgotToWriteMessageChance < FROGOT_ABOUT_YOU_PROBABILITY) {
      console.log("Forgotting to write message");
      etaIntervalSecs = -1;
      clearToughtloopInterval();
    }
  }
  if (etaIntervalSecs < 0) {
    const rememberedToWriteMessageChance = Math.random();
    if (rememberedToWriteMessageChance < REMEMBER_ABOUT_YOU_PROBABILITY) {
      console.log("Remembered to write message");
      clearInterval(intervalTimer);
      setToughtloopInterval();
    }
  }
}, 1000);

export const clearToughtloopInterval = () => {
  try {
    clearInterval(interval);
    //clearInterval(intervalTimer);
    console.log("Interval cleared");
    console.trace();
  } catch (e) {
    console.log("Error clearing interval", e);
  }
};
