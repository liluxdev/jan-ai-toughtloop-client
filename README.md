## First run

`npm i; npm start` to run it

Open your browser at `http://localhost:3000` to check the mobile first client and start the chatting expirience (you can browse it from your mobile if your PC IP address is available in your network, the software will bind to 0.0.0.0:3000, all IPs, for this purposed) 

![Demo mobile](path/to/image.png)

Remember to start the JAN.ai API server with its default port on localhost to have this client working


## Clean the conversation DBs

If the SQLite dbs are empty (delete the `stealth_db` folder content for a clean installation) it will be created at first boot, but you will need to run the npm start twice as it will fail with unexisting db at the first run

### Demo DBs

Demo repository is shipped with useful prompts and memory for agile development

## JAN.ai Model Settings

For this very first version of toughloop client, you can change the model only modifing an hardcoded constant found in this repo at `backend/constants.js`

```js
export const ASSISTANT_NAME = "Toughtloop AI";
export const MODEL_NAME = 'stealth-v1.2-7b';
```

## Enjoy your ride!

Allow notifications to get unsolecited messagess (I call it reverse prompting!)

If you don't want the unsolecited messages you can edit the tougthloop prompts clicking at the 'cog' icon and delete all the toughtloop prompts


## Brought to you by Lilux.dev

steven@lilux.dev