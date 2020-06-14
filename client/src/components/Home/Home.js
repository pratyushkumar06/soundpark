import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import Axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SocketContext from '../../Socket';
import banner from '../../assets/banner.png';
import './Home.scss';

const baseURL = 'http://13.233.142.76/api';

// Axios config
Axios.defaults.baseURL = baseURL;
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

class Home extends Component {
	UNSAFE_componentWillMount() {
		let loggedIn = new URLSearchParams(this.props.location.search).get('loggedIn');
		if (loggedIn === 'true') {
			localStorage.setItem('loggedIn', 'true');
		}
		if (loggedIn === 'false') {
			localStorage.setItem('loggedIn', 'false');
		}
	}

	componentDidMount() {
		let joinRoom = new URLSearchParams(this.props.location.search).get('joinRoom');
		if (joinRoom === 'false') {
			window.history.replaceState({}, document.title, '/');
			toast.dark('Please join a room first.', {
				position: 'top-right',
				autoClose: 3000,
				hideProgressBar: true,
				closeOnClick: true,
				pauseOnHover: true,
				draggable: true
			});
		}
	}

	getDevices = async () => {
		try {
			let resp = await Axios.get('/getDevices');
			resp = resp.data;
			if (resp.length > 0) {
				sessionStorage.setItem('deviceID', resp[0].id);
				console.log(resp[0].id);
			}
		} catch (err) {
			console.log(err);
		}
	};

	setDevice = async () => {
		try {
			await Axios.post('/setDevice', { deviceID: sessionStorage.getItem('deviceID') });
		} catch (err) {
			console.log(err);
		}
	};

	handleSubmit = async (e) => {
		try {
			e.preventDefault();
			let roomCode = e.target.roomCode.value;
			if (localStorage.getItem('loggedIn') === 'true') {
				await this.getDevices();
				if (!sessionStorage.getItem('deviceID')) {
					toast.dark('Please open Spotify first.', {
						toastId: 'noSpotify',
						position: 'top-right',
						autoClose: 3000,
						hideProgressBar: true,
						closeOnClick: true,
						pauseOnHover: true,
						draggable: true,
						limit: 1
					});
				} else {
					await this.setDevice();
					console.log('This ran?');
					sessionStorage.setItem('roomCode', roomCode);
					await Axios.get('/joinRoom', {
						params: { roomCode: roomCode }
					});
					console.log('Joined room ' + roomCode);
					window.location.href = '/player';
				}
			} else {
				window.location.href = '/?loggedIn=false';
			}
		} catch (err) {
			console.log(err);
		}
	};

	render() {
		let Btns =
			localStorage.getItem('loggedIn') === 'true' ? (
				<div>
					<Link to='/createRoom'>
						<button className='skewBtn blue'>Create</button>
					</Link>
					<Link to='/player'>
						<button className='skewBtn blue'>Player</button>
					</Link>
				</div>
			) : (
				<div>
					<a href={baseURL + '/auth/spotify'}>
						<button className='skewBtn green'>Login</button>
					</a>
				</div>
			);
		return (
			<div className='home-container'>
				<img className='banner' src={banner} alt='banner' />
				<form onSubmit={this.handleSubmit}>
					<input className='inp' type='text' placeholder='Enter room to join.' name='roomCode' />
					<button className='submit-btn' type='submit'>
						&rarr;
					</button>
				</form>
				{Btns}
				<ToastContainer />
			</div>
		);
	}
}

const HomewithSocket = (props) => (
	<SocketContext.Consumer>{(socket) => <Home {...props} socket={socket} />}</SocketContext.Consumer>
);

export default HomewithSocket;
