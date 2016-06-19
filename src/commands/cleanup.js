import { BaseCommand, CommandError } from './base';

import spotifyApi, { getAllSongIds } from '../spotify';


export default class CleanupCommand extends BaseCommand {
    static params = '';
    static help = 'Cleanup playlist from duplicates (e.g. after importing other playlists)';

    async handleCommand(params) {
        let duplicates;
        let playListData;

        try {
            playListData = await spotifyApi.getPlaylist(
                process.env.SPOTIFY_USERNAME,
                process.env.SPOTIFY_PLAYLIST_ID,
                {fields: 'snapshot_id'}
            );
        } catch(err) {
            throw new CommandError(`Error occured: ${err.message}`);
        }

        try {
            duplicates = await getDuplicateSongs();
        } catch(e) {
            throw e;
        }

        if (!duplicates || !Object.keys(duplicates).length) {
            throw new CommandError('No duplicates found.');
        }

        const dupPositions = Object.keys(duplicates);

        try {
            await spotifyApi.removeTracksFromPlaylist(
                process.env.SPOTIFY_USERNAME,
                process.env.SPOTIFY_PLAYLIST_ID,
                dupPositions.map(idx => ({
                    uri: `spotify:track:${duplicates[idx]}`,
                    position: parseInt(idx)
                })).slice(0, 100),
                {snapshot_id: playListData.snapshot_id}
            );
        } catch (err) {
            throw new CommandError(`Error occured: ${err.message}`);
        }

        // Spotify allows us to remove only 100 items at a time, lets just conform to it and ask the user
        // to run the cleanup command again
        if (dupPositions.length > 100) {
            return `Removed 100 of ${dupPositions.length} duplicates. Run the command again to cleanup remaining items`;
        }

        return `Removed ${dupPositions.length} duplicates`;
    }
};


async function getDuplicateSongs() {
    let trackIds;

    try {
        trackIds = await getAllSongIds(
            process.env.SPOTIFY_USERNAME,
            process.env.SPOTIFY_PLAYLIST_ID,
        );
    } catch(e) {
        throw e;
    }

    const seen = new Set();
    const dups = {};

    trackIds.forEach((x, position) => {
        if (seen.has(x)) {
            dups[position] = x;
        } else {
            seen.add(x);
        }
    });

    return dups;
}
