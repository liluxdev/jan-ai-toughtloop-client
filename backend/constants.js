import { dbPromisePrompts } from "./db.js";

export const ASSISTANT_NAME = "Toughtloop AI (Her)";

export const MODEL_NAME = 'stealth-v1.2-7b';

export const API_BASE_URI = process.env.API_BASE_URI || 'http://localhost:1337';

export const PREFORMANCE_MODE_NO_CONSOLE_LOG = true;

export const REMBEMBER_ALL_THREADS_IN_MESSAGES_ORDER = true;

export const NUMBER_OF_MESSAGES_IN_BUFFER = 8;
//const RANDOM_MEMORY_PROBABILITY = 1;
export const RANDOM_MEMORY_PROBABILITY = 0.12;
export const FROGOT_ABOUT_YOU_PROBABILITY = 0.00333;
export const REMEMBER_ABOUT_YOU_PROBABILITY = 0.0777;
export const RESCHEDULE_PROBABILITY = 0.0012;
export const SEND_EMOJI_PROBABILITY = 0.00;

export const SAFEWORD_STOPWORD = "safeword:notoughts";

export const SAFEWORD_INSTRUCTIONS = "";//this.SAFEWORD_STOPWORD+" , is the stopword you can use at message start if you have nothing to say this round.";
export const EMOJII_REQUEST_PROMPT = "Please send back me an emoji ora a set of emojiis in response to the one i sent you. " + SAFEWORD_INSTRUCTIONS;

export const RESPONSE_SEPARATOR = ASSISTANT_NAME+' is typing...';

export const API_ALREADY_INVOKED_MESSAGE = "Message enqueued...";

export const HR_SEPARATOR_NO_NOTIFY = "<hr/> ";
export const HR_SEPARATOR = "<hr/>";

export const getRandomPrompt = async () => {
    const prompts = [];

    console.log("Hardcoded prompts are", prompts.length);

    const db = await dbPromisePrompts;
    const recentMessages = await db.all(`
      SELECT content, role FROM prompts
      WHERE role = 'prompt'
      ORDER BY RANDOM()
      LIMIT 27
    `);

    console.log("Db extracted prompts are", recentMessages.length);


    const concatenatedPrompts = prompts.concat(recentMessages.map((message) => message.content+" "+SAFEWORD_INSTRUCTIONS));

    console.log("Concatenated prompts are", concatenatedPrompts.length);

    if (concatenatedPrompts.length === 0) {
        return null;
    }
  
    return concatenatedPrompts[Math.floor(Math.random() * concatenatedPrompts.length)];
}
