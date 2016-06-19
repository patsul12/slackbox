import { CommandError } from './base';

import spotifyApi from '../spotify';

import SearchCommand from './search';


export default class RemoveCommand extends SearchCommand {
    static help = 'Remove a song. Query should be in the following formats: `song name` or `artist - song`';

    async sendResult(track) {
        try {
            await spotifyApi.removeTracksFromPlaylist(
                process.env.SPOTIFY_USERNAME,
                process.env.SPOTIFY_PLAYLIST_ID,
                [{
                    uri: `spotify:track:${track.id}`
                }],
            );
        } catch(err) {
            throw new CommandError(`Error occured: ${err.message}`);
        }

        return `Track removed: *${track.name}* by *${track.artists[0].name}*`;
    };
}
