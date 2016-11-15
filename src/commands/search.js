import { BaseCommand, CommandError } from './base';

import spotifyApi from '../spotify';


export default class SearchCommand extends BaseCommand {
    static params = 'query';
    static help = 'Search for a song. Query should be in the following formats: `song name` or `artist - song`';

    async handleCommand(params) {
        const query = this.parseSongQuery(params);
        let data;

        // Only catch spotify errors
        try {
            data = await spotifyApi.searchTracks(query);
        } catch(err) {
            throw new CommandError(`Error occured: ${err.message}`);
        }

        // any errors here are caught by the command handler
        const track = this.getResult(data);

        try {
            const res = await this.sendResult(track);
            return res;
        } catch(e) {
            throw e;
        }
    }

    sendResult(track) {
        return `Found track: *${track.name}* by *${track.artists[0].name}*`;
    }

    getResult(data) {
        const results = data.body.tracks.items;

        if (results.length === 0) {
            throw new CommandError('Could not find that track.');
        }

        return results[0];
    }

    parseSongQuery(params) {
        params = (params || '').trim();

        if (!params) {
            throw new CommandError('Please enter a search query');
        }

        if(params.indexOf(' - ') === -1) {
            return `track:${params}`;
        } else {
            const pieces = params.split(' - ');

            return `artist:${pieces[0].trim()} track:${pieces[1].trim()}`;
        }
    }
}
