# Mercurio, the moody thermometer 🌡️

A chatbot whose personality changes with the temperature you set.
Drag the thermometer and Mercurio changes from a frozen bureaucrat (−30 °C) to a grumpy Viennese
waiter, a smug room-temperature assistant, an over-caffeinated football commentator, and finally
a boiling, pigeon-suspicious meltdown (60 °C).

## How the temperature changes the bot

| Reading | Mood | What Claude is told |
|---|---|---|
| −30 to −5 °C | Frozen solid | 8 words max, glacial, can't feel its bulb |
| −4 to 12 °C | Chilly | Dry sarcasm, Viennese-waiter disdain |
| 13 to 26 °C | Room temperature | Warm, helpful, smug about being calibrated |
| 27 to 40 °C | Sweaty | Cup-final commentator energy, emojis |
| 41 to 60 °C | Meltdown | Unhinged poetry, Italian exclamations, pigeons |

The reading is also turned into a **chaos level** from 0.00 to 1.00 that goes into the prompt.
Newer Claude models (like Haiku 5.5) don't accept a `temperature` setting, so the slider steers the
personality through the prompt instead. If you switch to an older model that does accept it,
add `USE_SAMPLING_TEMPERATURE=true` in Vercel and the slider controls the real sampling temperature too.

## Files

```
index.html     the page
style.css      the five colour themes and the thermometer
app.js         thermometer dragging, chat, offline replies
api/chat.js    the server function that talks to Claude (keeps your key secret)
package.json   tells Vercel to use modern JavaScript
```

Without an API key the site still works in **offline mode** with built-in joke replies.

## Deploy it

1. Get a key at https://console.anthropic.com (API keys), and add a few dollars of credit.
2. Create a GitHub repository and upload these files (keep the `api` folder).
3. At https://vercel.com, sign in with GitHub, choose **Add New → Project**, and import the repository.
   Framework preset: **Other**. Leave build settings empty.
4. In **Environment Variables**, add `ANTHROPIC_API_KEY` with your key, then **Deploy**.
5. If you add the key after the first deploy, go to **Deployments → ⋯ → Redeploy**.

Every push to GitHub redeploys the site automatically.

## Change it

- Personalities: edit the `ZONES` prompts in `api/chat.js`.
- Offline jokes, mood lines, the comments Mercurio makes when you change zone: `ZONES` in `app.js`.
- Colours: the `body[data-zone=…]` blocks at the top of `style.css`.
- Model: set `ANTHROPIC_MODEL` in Vercel.

## Safety

Your key lives only in Vercel. Never paste it into `app.js` or commit it to GitHub.
Anyone with your link can chat and spend your credit, so set a monthly spend limit in the Claude Console.
