import Koa from "koa";
import Router from "koa-router";
import koaStatic from "koa-static";
import websockify from "koa-websocket";
import fs from "fs";
import { getWebsocketClients, wsRouter } from "./backend/websockets.js";
import {
  dbPromise,
  dbPromiseMemory,
  dbPromisePrompts,
  dbVersions,
  initDb,
  setMessageThread,
} from "./backend/db.js";
import { startCpuWebSocket } from "./backend/cpu.js";
import { EMOJII_REQUEST_PROMPT, FROGOT_ABOUT_YOU_PROBABILITY, PREFORMANCE_MODE_NO_CONSOLE_LOG, REMEMBER_ABOUT_YOU_PROBABILITY, RESCHEDULE_PROBABILITY, SEND_EMOJI_PROBABILITY, getRandomPrompt } from "./backend/constants.js";
import { getApiContextDebug, getConfiguration, incrementGenericCounter, invokeApi } from "./backend/api.js";
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
let currentIntervalLengthSecs = 333;

export const getEtaIntervalSecs = () => {
  return etaIntervalSecs;
};


export const setToughtloopInterval = async (timing = 333) => {
  const conf = await getConfiguration();
  console.error(conf);
  const toughtloopIntervalRandomMaxSecs = parseInt(conf.toughtloopIntervalRandomMaxSecs) || 333;
  console.error("Random max secs", toughtloopIntervalRandomMaxSecs);
  const radnomAdditionalSecs = Math.floor(Math.random() * toughtloopIntervalRandomMaxSecs);
  console.error("Random additional secs", radnomAdditionalSecs);
  timing += radnomAdditionalSecs;
  currentIntervalLengthSecs =  timing;
  clearToughtloopInterval();
  console.log("Setting interval", timing);
  interval = setInterval(async () => {

    const conf = await getConfiguration();
    if (conf.toughtloopEnabled !== "1" || false){
      console.error("Toughloop is disabled, skipping...");
      incrementGenericCounter("skipped_toughtloop_disabled_count");
      return;
    }

    if (getWebsocketClients().length === 0){
      if (toughtloopIntervalRandomMaxSecs < 4 * 60 * 60) {
        console.error("No clients connected and slider is at "+toughtloopIntervalRandomMaxSecs / 60 / 60+"h , skipping toughtloop");
        incrementGenericCounter("skipped_no_clients_count");
        return;
      }else{
        console.error("No clients connected and slider is at "+toughtloopIntervalRandomMaxSecs / 60 / 60+"h , sending toughtloop anyway");
        incrementGenericCounter("sending_anyway_no_clients_count");
      }
    }
    const toughloopPrompt = await getRandomPrompt();
    if (!toughloopPrompt) {
      console.log("No toughtloop prompt found");
      return;
    }
    console.error("Sending toughloop prompt...", toughloopPrompt);
    await invokeApi(toughloopPrompt, false);
  }, timing * 1000);
  etaIntervalSecs = timing;
};

export const getRandomAsciiEmoji = () => {
  return String.fromCodePoint(Math.floor(Math.random() * (0x1F601 - 0x1F600 + 1)) + 0x1F600);
}

intervalTimer = setInterval(async () => {
  etaIntervalSecs--;
  if (etaIntervalSecs < 0) {
    if (await getApiContextDebug().invokingApi){
      console.error("I'm writing a message...");
      return;
    }
    console.log("I don't want to write a message", etaIntervalSecs);
  } else {
    if (etaIntervalSecs % 60 === 0) {
      console.error("I want to write a message in", etaIntervalSecs / 60, "minutes");
    }
  }
  const forgotToWriteMessageChance = Math.random();
  console.log("Forgot to write message chance", forgotToWriteMessageChance,FROGOT_ABOUT_YOU_PROBABILITY, FROGOT_ABOUT_YOU_PROBABILITY / currentIntervalLengthSecs * 333 );
  if (etaIntervalSecs > 0) {
    if (forgotToWriteMessageChance < FROGOT_ABOUT_YOU_PROBABILITY / currentIntervalLengthSecs * 333 ) {
      await incrementGenericCounter("forgot_count");
      console.error("Forgotting to write message");
      etaIntervalSecs = -1;
      clearToughtloopInterval();
    }
  }
  if (etaIntervalSecs < 0) {
    const rememberedToWriteMessageChance = Math.random();
    if (rememberedToWriteMessageChance < REMEMBER_ABOUT_YOU_PROBABILITY / currentIntervalLengthSecs * 333) {
      await incrementGenericCounter("remember_count");
      console.error("Remembered to write message");
      //clearInterval(intervalTimer);
      setToughtloopInterval();
    }
  }else{
    const emojiChance = Math.random();
    if (emojiChance < SEND_EMOJI_PROBABILITY / currentIntervalLengthSecs * 333) {
      await incrementGenericCounter("emoji_count");
      const emoji = getRandomAsciiEmoji();
      console.error("Sending emoji",emoji);
      await invokeApi(emoji + EMOJII_REQUEST_PROMPT, false);
    }
    const rescheduleCahnce = Math.random();
    if (rescheduleCahnce < RESCHEDULE_PROBABILITY / currentIntervalLengthSecs * 333) {
      await incrementGenericCounter("reschedule_count");
      console.error("Rescheduling");
      //clearInterval(intervalTimer);
      setToughtloopInterval();
    }
  }
}, 1000);

export const clearToughtloopInterval = () => {
  try {
    clearInterval(interval);
    etaIntervalSecs = -1;
    //clearInterval(intervalTimer);
    console.log("Interval cleared");
    console.trace();
  } catch (e) {
    console.log("Error clearing interval", e);
  }
};


/* process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  incrementGenericCounter("uncaught_exception_count");
  // Perform any necessary cleanup or error handling here
  process.exit(1); // Exit the process with a non-zero exit code
});
*/
/*  
process.on('SIGQUIT', () => {
  console.error('SIGQUIT signal received');
  // Add your code here to handle the SIGQUIT signal
});

process.on('SIGINT', () => {
  console.error('SIGINT signal received');
  // Add your code here to handle the SIGINT signal
  process.exit(0); // Exit the process with a zero exit code
});

process.on('SIGTERM', () => {
  console.error('SIGTERM signal received');
  // Add your code here to handle the SIGTERM signal
  process.exit(0); // Exit the process with a zero exit code
});

process.on('SIGINT', () => {
  console.error('SIGINT signal received');
  // Add your code here to handle the SIGINT signal
  process.exit(0); // Exit the process with a zero exit code
});

 */