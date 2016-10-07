import SpotifyWebApi from 'spotify-web-api-node';

import cache from './cache';


const api = new SpotifyWebApi({
    clientId     : process.env.SPOTIFY_KEY,
    clientSecret : process.env.SPOTIFY_SECRET,
    redirectUri  : process.env.SPOTIFY_REDIRECT_URI
});


cache.get('access_token', (error, accessToken) => {
    if (error) {
        console.error(`Failed to load presisted data: ${error}`);
    } else {
        api.setAccessToken(accessToken);

        cache.get('refresh_token', (error, refreshToken) => {
            api.setRefreshToken(refreshToken);
        });
    }
});

export const storeTokens = (accessToken, refreshToken) => {
    // Set access token
    api.setAccessToken(accessToken);
    cache.set('access_token', accessToken, (error, val) => {
        if (error) {
            console.error(`Failed to persist access token im memcached: ${error}`);
        }
    });

    // Set refresh token if its available
    if (refreshToken) {
        api.setRefreshToken(refreshToken);
        cache.set('refresh_token', refreshToken, (error, val) => {
            if (error) {
                console.error(`Failed to persist refresh token im memcached: ${error}`);
            }
        });
    }
};

export async function getPlaylistTrackPage(username, playListId, pageNumber=0, limit=100, wantTotal=false) {
    let data;

    try {
        data = await api.getPlaylistTracks(
            username, playListId,
            {
                fields: 'total,limit,items(track(id))',
                offset: pageNumber * limit,
                limit,
            }
        );
    } catch(error) {
        throw error;
    }

    const items = data.body.items.map(item => item.track.id);

    if (wantTotal) {
        if (data.body.limit !== limit) {
            throw new Error('Spotify has changed their maximum limit value, please notify us at github');
        }

        return {
            totalCount: data.body.total,
            items
        };
    } else {
        return items;
    }
}

export async function getAllSongIds(username, playListId) {
    const limit = 20;

    let firstPage;

    try {
        firstPage = await getPlaylistTrackPage(username, playListId, 0, limit, true);
    } catch(e) {
        throw e;
    }

    if (firstPage.items.length >= firstPage.totalCount) {
        return firstPage.items;
    } else {
        const promises = [[...firstPage.items], ];

        for (let i = 1; i <= Math.ceil(firstPage.totalCount / limit); i += 1) {
            promises.push(getPlaylistTrackPage(username, playListId, i, limit));
        }

        let items;

        try {
            items = await Promise.all(promises);
        } catch(e) {
            // Throw if anything fails
            throw e;
        }

        // Normalize to a single list of ids
        return items.reduce((a, b) => a.concat(b));
    }
}

export default api;
