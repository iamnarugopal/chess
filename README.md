# Chess PWA

A fast, browser-based chess game built with Next.js, Stockfish, and react-chessboard.

Play against the engine, switch sides, change board themes, enable sounds, and install the app as a PWA on supported browsers.

## Features

- Play as White or Black against Stockfish
- Multiple board themes
- Move, capture, check, castle, promote, and game-over sounds
- Mobile-friendly layout with in-app controls
- Installable PWA with a native app-style window
- Responsive sidebar and mobile settings drawer
- Take back moves during a game

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- chess.js
- react-chessboard
- stockfish
- Base UI components
- Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
```

### Start the production server

```bash
npm run start
```

## How to Play

1. Open the app.
2. Choose your color.
3. Make your moves on the board.
4. Use the settings panel to change difficulty, board theme, or sound.
5. Use Take Back if you want to undo a move.

## PWA / Install

This project is configured as a PWA and can be installed on supported browsers.

- On mobile, look for the Install button in the top bar when the browser marks the app as installable.
- On desktop Chrome, use the install icon in the address bar or the browser menu.
- If the prompt does not appear immediately, refresh once after opening the app from localhost.

## Project Structure

```text
src/
	app/
		layout.tsx
		page.tsx
		globals.css
	components/
		ChessBoard.tsx
		ChessSettings.tsx
		GameResultModal.tsx
		MobileSettingsDrawer.tsx
		PwaInstallButton.tsx
		PwaRegistration.tsx
public/
	sounds/
	stockfish/
	manifest.webmanifest
```

## Scripts

- npm run dev - start the development server
- npm run build - create the production build
- npm run start - start the production server
- npm run lint - run ESLint

## Notes

- The app uses Stockfish in the browser through a Web Worker.
- Sound playback may require a user gesture before the browser allows audio.
- The project is configured for static export, so it can be deployed to static hosting.

## License

No license file is included yet.
