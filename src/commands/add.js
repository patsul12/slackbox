import { CommandError } from './base';

import spotifyApi from '../spotify';

import SearchCommand from './search';


export default class AddCommand extends SearchCommand {
    static help = 'Add a song. Query should be in the following formats: `song name` or `artist - song`';

    async sendResult(track) {
        try {
            await spotifyApi.addTracksToPlaylist(
                process.env.SPOTIFY_USERNAME,
                process.env.SPOTIFY_PLAYLIST_ID,
                `spotify:track:${track.id}`,
            );
        } catch(err) {
            throw new CommandError(`Error occured: ${err.message}`);
        }

        return {
          response_type: "in_channel",
          text: `Track added: *${track.name}* by *${track.artists[0].name}*`
        };
    };
}
