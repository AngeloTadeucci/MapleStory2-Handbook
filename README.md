# MapleStory 2 Handbook

MapleStory 2 Handbook is a searchable database of items and NPCs in the popular MMORPG MapleStory 2. The project allows users to easily look up information on in-game items and NPCs, including their stats, locations, and other relevant details.

## Required Technology

- Node.js 16+
- npm
- MySQL 8

## Installation

1. Clone the repository: `git clone https://github.com/AngeloTadeucci/Maple2Codex-FrontEnd-Svelte`
2. Install dependencies: `npm install`
3. Go to `Maple2Codex-FrontEnd-Svelte/static/resource/image` and unzip **image.7z**
4. Get the database and 3D models from the [MS2 Dev discord](https://discord.com/invite/mABkFFhBuU) in the [tools channel](https://discord.com/channels/783045053501276170/1061066540998479911).
5. Import the database and unzip the models inside `Maple2Codex-FrontEnd-Svelte/static/glbs`
6. Start the application: `npm run dev`

Note: You will need to have a MySQL server running and the connection details configured in a .env file in the root of the project.

Note: You can use NODE_ENV as **production** to serve the 3D models from another folder, using for example nginx.

## Live demo

[handbook.tadeucci.dev](https://handbook.tadeucci.dev)

## Contributing

This project is open to contributions, feel free to fork and submit pull requests.

## Todo

- [ ] Finish NPC details page
- [ ] Add maps, quests, trophies, dungeons, skills, dyes and more.

## License

This project is licensed under the [MIT License](https://github.com/AngeloTadeucci/Maple2Codex-FrontEnd-Svelte/blob/master/LICENSE).
