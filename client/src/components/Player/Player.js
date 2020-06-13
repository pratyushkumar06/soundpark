import React, { Component } from 'react';
import cover from '../../assets/cover.png';
import Axios from 'axios';
import './Player.scss';
import io from 'socket.io-client';
import { Link } from 'react-router-dom/cjs/react-router-dom.min';
const baseURL = 'http://13.233.142.76/api';
const socket = io('http://13.233.142.76', {
	secure: true,
	rejectUnauthorized: true,
	path: '/rooms/socket.io'
});
// Axios config
Axios.defaults.baseURL = baseURL;
Axios.defaults.headers['Content-Type'] = 'application/json';
Axios.defaults.withCredentials = true;
Axios.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		if (error.response.status === 401) {
			window.location.href = '/?loggedIn=false';
		}
		return error;
	}
);

export class Player extends Component {
	constructor(props) {
		super(props);

		this.state = {
			nowPlaying: {
				name: sessionStorage.getItem('currentSong') || 'Queue is empty!',
				albumArt: sessionStorage.getItem('currentArt') || cover
			},
			searchValue: '',
			searchResult: {
				searchedYet: false,
				id: '',
				name: '',
				artist: '',
				album: '',
				uri: '',
				albumArt: ''
			},
			room: sessionStorage.getItem('roomCode'),
			queue: [],
			users: []
		};
	}

	componentDidMount() {
		socket.on('joined_room', (data) => {
			if (data !== null) {
				this.setState({
					queue: data.queue,
					users: data.users
				});
			}
		});
		socket.on('left_room', (data) => {
			this.setState({
				queue: [],
				users: data
			})
		})
		socket.emit('join_room', this.state.room);
		socket.on('currently_playing', async (data) => {
			console.log('Song change event.');
			if (data.song !== null) {
				if (data.playedNext === true) {
					await Axios.post('/playNextReturns', { id: data.id });
				}
				let q = this.state.queue.shift();
				console.log('Remove song: ' + q);
				sessionStorage.setItem('currentSong', data.song.trackName);
				sessionStorage.setItem('currentArt', data.song.albumArt);
				this.setState({
					nowPlaying: {
						name: data.song.trackName,
						albumArt: data.song.albumArt,
						queue: q
					}
				});
			}
		});
		socket.on('add_to_queue', async (data) => {
			console.log('Add to queue event.');
			await Axios.post('/queueReturns', {
				room: this.state.room,
				id: data.id
			});
			this.setState({
				queue: data.queue
			});
			this.getNowPlaying();
		});
	}

	// componentWillUnmount() {
	// 	window.addEventListener('beforeunload', e => {
	// 		e.preventDefault();
	// 		this.leaveRoom();
	// 	})
	// }

	getNowPlaying = async () => {
		try {
			console.log('Fetched currently playing.');
			let resp = await Axios.get('/currentlyPlaying');
			resp = resp.data;
			if (resp.item) {
				sessionStorage.setItem('currentSong', resp.item.name);
				sessionStorage.setItem('currentArt', resp.item.album.images[0].url);
				this.setState({
					nowPlaying: {
						name: resp.item.name,
						albumArt: resp.item.album.images[0].url
					}
				});
			} else {
				this.setState({
					nowPlaying: {
						name: 'Nothing is playing!',
						albumArt: cover
					}
				});
			}
		} catch (err) {
			console.log(err);
		}
	};

	searchSong = async () => {
		try {
			const searchValue = this.state.searchValue;
			console.log('Searched: ' + searchValue);
			let resp = await Axios.get('/searchTrack', {
				params: {
					searchValue: searchValue
				}
			});
			resp = resp.data;
			console.log(resp);
			this.setState({
				searchResult: {
					searchedYet: true,
					id: resp.tracks.items[0].id,
					name: resp.tracks.items[0].name,
					album: resp.tracks.items[0].album.name,
					artist: resp.tracks.items[0].artists[0].name,
					uri: resp.tracks.items[0].uri,
					albumArt: resp.tracks.items[0].album.images[0]
				}
			});
		} catch (err) {
			console.log(err);
		}
	};

	addToQueue = async () => {
		try {
			const searchResult = this.state.searchResult;
			let track = {
				id: searchResult.id,
				name: searchResult.name,
				artist: searchResult.artist,
				album: searchResult.album,
				uri: searchResult.uri,
				albumArt: searchResult.albumArt
			};
			let roomCode = sessionStorage.getItem('roomCode');
			let resp = await Axios.post('/addToQueue', {
				roomCode,
				track
			});
			console.log(resp.data);
			this.setState({
				queue: resp.data
			});
			console.log('Added to queue.');
			this.getNowPlaying();
		} catch (err) {
			console.log(err);
		}
	};

	playNext = async () => {
		try {
			let roomCode = sessionStorage.getItem('roomCode');
			let resp = await Axios.post('/playNext', { roomCode });
			console.log(resp);
		} catch (err) {
			console.log(err);
		}
	};

	playPause = async () => {
		try {
			let roomCode = sessionStorage.getItem('roomCode');
			let resp = await Axios.get('/playPause', {
				params: {
					roomCode: roomCode
				}
			});
			console.log(resp);
		} catch (err) {
			console.log(err);
		}
	};

	leaveRoom = async () => {
		try {
			await Axios.get('/leaveRoom', {
				params: { roomCode: sessionStorage.getItem('roomCode')}
			})
			socket.emit('leave_room', this.state.room);
			sessionStorage.removeItem('roomCode');
		} catch (err) {
			console.log(err);
		}
	}

	handleSearch = async (e) => {
		e.preventDefault();
		this.setState({ searchValue: e.target.searchValue.value }, this.searchSong);
	};

	render() {
		const { searchedYet, name, album, artist } = this.state.searchResult;
		const { nowPlaying, queue, users } = this.state;
		let result;
		if (searchedYet) {
			result = (
				<div className='search-res'>
					<p>Song: {name}</p>
					<p>Artist: {artist}</p>
					<p>Album: {album}</p>
					<button onClick={this.addToQueue}>Add</button>
				</div>
			);
		}

		let queueListItems = (
			<ul className='queue-list'>
				{queue.map((song) => (
					<li key={song.uri}>
						{song.trackName} - {song.artist}
					</li>
				))}
			</ul>
		);

		let usersListItems = (
			<ul className='users-list'>
				{users.map((u) => (
					<li key={u}>
						{u}
					</li>
				))}
			</ul>
		);

		return (
			<div>
				<div className='player-container'>
					<h3>Now Playing</h3> <h3>{nowPlaying.name}</h3>
					<img className='album-art' src={nowPlaying.albumArt} alt='albumArt' />
					<button className='control-btns' onClick={this.playPause}>
						Play/Pause
					</button>
					<button className='control-btns' onClick={this.playNext}>
						Next
					</button>
					<form onSubmit={this.handleSearch}>
						<input type='text' placeholder='Search for a song...' name='searchValue' />
						<button className='search-btn' type='submit'>
							&rarr;
						</button>
					</form>
					{result}
				</div>
				<Link to='/'>
					<button className='control-btns' onClick={this.leaveRoom}>
						LEAVE
					</button>
				</Link>
				<div className='queue-container'>
					<h2> QUEUE </h2>
					{queueListItems}
				</div>
				<div className='users-container'>
					<h2> MEMBERS </h2>
					{usersListItems}
				</div>
			</div>
		);
	}
}

export default Player;
