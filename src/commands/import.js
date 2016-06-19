import { BaseCommand, CommandError } from './base';

import spotifyApi, { getAllSongIds } from '../spotify';


export default class ImportPlaylist extends BaseCommand {
    static params = 'url';
    static help = 'Import playlist by url';

    async handleCommand(params) {
        params = params;

        const mat = params.match(/^(https?:\/\/)?play.spotify.com\/user\/([^\/]+)\/playlist\/([^\/]+)$/i);

        if (!mat || !mat[2] || !mat[3]) {
            throw new CommandError('Please enter a valid spotify playlist url');
        }

        let allSongs;

        try {
            const res = await getAllSongIds(mat[2], mat[3]);
            allSongs = [...new Set(res)];
        } catch(err) {
            throw new CommandError(`Error occured: ${err.message}`);
        }

        if (!allSongs.length) {
            throw new CommandError(`That playlist has no songs!`);
        }

        // Add all songs in batches of 100
        const promises = [];

        for (let i = 0; i < allSongs.length; i += 100) {
            promises.push(spotifyApi.addTracksToPlaylist(
                process.env.SPOTIFY_USERNAME,
                process.env.SPOTIFY_PLAYLIST_ID,
                allSongs.slice(i, i + 100).map(trackId => `spotify:track:${trackId}`),
            ));
        }

        try {
            await Promise.all(promises);
        } catch(err) {
            throw new CommandError(`Error occured: ${err.message}`);
        }

        return `Successfully imported playlist (${allSongs.length} songs) from url ${params}`;
    }
}
