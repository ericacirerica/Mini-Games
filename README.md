# 🎮 Mini Games

A little collection of cozy, one-player browser games in a pink and matcha theme. Pick a game from the hub and play. No sign-up, no downloads, and it works offline once installed on your phone.

**▶ Play it here: https://ericacirerica.github.io/Mini-Games/**

Made by [Erica](https://github.com/ericacirerica)

---

## The games

| Game                | How to play                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 🃏 **Memory Match** | Flip two cards at a time and find every pair. Choose Easy, Medium or Hard, and try to beat your best number of moves.               |
| 🎵 **Simon Says**   | Watch the pattern of lights and sounds, then repeat it. Every round adds one more step.                                             |
| 🐍 **Snake**        | Eat the pink dots to grow, and don't hit the wall or yourself. Use the arrow keys, WASD, or swipe on a phone.                       |
| 🔨 **Whack-a-Mole** | Tap each mole before it hides. You have 45 seconds, two moles can pop up at once, and they get faster. On a keyboard, press 1 to 9. |

More games are on the way. 🍵

## Features

- 🌸 A pink and matcha theme across every game
- 🔊 Sound effects, with a Sound on/off button in each game
- 🏆 Best scores are saved in your browser
- 📱 Works on phones, tablets and computers
- ✈️ Installable as an app, and playable without wifi

## Install it on your phone

1. Open the link above on your phone, with internet.
2. **iPhone (Safari):** tap Share, then **Add to Home Screen**.
   **Android (Chrome):** tap the ⋮ menu, then **Install app** or **Add to Home screen**.
3. Open the app once and tap into each game, so it's saved for offline play.

After that, it opens from your home screen like a normal app, even with no signal.

## Run it on your computer

1. Download or clone this repository.
2. Open the folder in VS Code and install the **Live Server** extension.
3. Right-click the main `index.html` and choose **Open with Live Server**.

You can also open any game's `index.html` by double-clicking it.

## Project structure

```
Mini-Games/
├── index.html            the hub page with a card for each game
├── style.css             styling for the hub
├── manifest.webmanifest  lets the site be installed as an app
├── sw.js                 saves the games for offline play
├── icons/                the app icons
├── memory-game/          each game has its own folder
├── simon-says/           with index.html, style.css and script.js
├── snake/
└── whack-a-mole/
```

## Built with

- HTML, CSS and plain JavaScript, with no frameworks
- The Web Audio API for sounds, so there are no audio files
- `localStorage` for saving best scores
- A service worker and web manifest for offline use
- GitHub Pages for hosting

## Adding a new game

1. Make a new folder with `index.html`, `style.css` and `script.js`.
2. Turn its "Coming soon" card on the hub into a link, or add a new card.
3. Add the new files to the list in `sw.js` and change the version number, for example `mini-games-v2` to `mini-games-v3`.

## Credits

Designed and built by [Erica](https://github.com/ericacirerica).
