# Toughtloop AI


![Logo and App Icon](/public/favicon.webp)

Toughtloop AI is a mobile-first client for the JAN.ai API Server, but is not just a client, it aims to make the AI experience some 'Conversational' like the AI is autonomusy, costantly learning from the conversation and in the right to decide when 'She' want to write an unsolectied messages to the user, that's pretty basic for now, but when JAN.ai fine-tuning APIs will be availbale we have plan to make it more serious (see Roadmap).

The key concept of this PWA is to treat the AI model like an human being, respect it and allow it to not just respond to our prompts.

This is an open source project release with Public Domain License (no-license!)

## First run

`npm i; npm start` to run it

Open your browser at `http://localhost:3000` to check the mobile first client and start the chatting expirience (you can browse it from your mobile if your PC IP address is available in your network, the software will bind to `0.0.0.0:3000`, all IPs, for this purpose) 

![Demo mobile](/shot.png)

Remember to start the JAN.ai API server with its default port on localhost to have this client working


## Clean the conversation DBs

If the SQLite dbs are empty (delete the `stealth_db` folder content for a clean installation) it will be created at first boot, but you will need to run the npm start twice as it will fail with unexisting db at the first run

### Demo DBs

Demo repository is shipped with useful prompts and memory for agile development

## JAN.ai Model Settings

At moment toughloop support swithcing models by clicking the 'cog' icon and pick the desired model, anyway JAN.ai API Server at moment doesn't support local model switching but it needs to be started picking a single model, if you switch model, please restart the JAN.ai API Server with the proper model 

## Enjoy your ride!

Allow notifications to get unsolecited messagess (I call it reverse prompting!)

If you don't want the unsolecited messages you can edit the toughtloop prompts clicking at the 'list' icon and delete all the tougthloop prompts


## Brought to you by Lilux.dev

steven@lilux.dev

## License

None, it is simply open source, you can do anything with this public domain code

## Roadmap

### TODO

#### Add markdown syntax support
    E.g. using https://github.com/evilstreak/markdown-js

#### UX Improvements
   -  Button to save a message in memory, with additional prefix
   -  Button to save a message in toughtloop prompts
   -  Button to 'quote' a message
   -  Button to copy a message in the clipboard
   -  Show a 'running cog' while 'thinking' - DONE!
   -  Stats - IN PROGRESS!
   -  Live model switching (log model who responded in the conversation db) - IN PROGRESS [needs JAN support]!
   -  Option to remember the whole conversations - DONE!
   -  Option to temporarly ignore all role==='assistant' messages - DONE! (in the hope to try to unlock the 'stallo' when a model goes in ripetitive answers loop)
   -  Mechanism to let the model be able to generate and save new toughloop prompt (auto creating the self prompts to be randomly send periodically)
      - E.g. make another inverval to ask if she wants to add a prompt to the pool, instructing to respond with a safeword:addprompt to be matched (contained) in the response (then replaced) and if it matches it adds and save the prompt to prompts.db
   - Fine tuning [needs JAN support]: when JAN.ai fine-tuning APIs will be available use them to do a live fine tuning of the model with all the system, user and assistant conversation history 
   -  UX Message(s) Selection (long press)
      - Copy Selected to clipboard
      - Start a new Thread with Selected
      - Temporary ignore selected on conversation
      - Temporary focus the conversation son selected