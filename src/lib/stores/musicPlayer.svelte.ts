import { browser } from '$app/environment';
import { PUBLIC_MODELS_URL } from '$env/static/public';

export interface Track {
	id: number;
	name: string;
	fileName: string;
	durationSeconds: number;
}

const AUDIO_BASE_URL = `${PUBLIC_MODELS_URL}bgm/`;

class MusicPlayerState {
	currentTrack = $state<Track | null>(null);
	playlist = $state<Track[]>([]);
	playlistIndex = $state(-1);
	isPlaying = $state(false);
	volume = $state(0.7);
	currentTime = $state(0);
	duration = $state(0);
	isVisible = $state(false);
	shuffle = $state(false);
	loop = $state(false);

	private audio: HTMLAudioElement | null = null;
	private animFrameId: number | null = null;

	constructor() {
		if (browser) {
			this.audio = new Audio();
			this.audio.volume = this.volume;

			this.audio.addEventListener('ended', () => {
				if (this.loop) {
					this.seek(0);
					this.audio?.play();
				} else {
					this.next();
				}
			});

			this.audio.addEventListener('loadedmetadata', () => {
				if (this.audio) {
					this.duration = this.audio.duration;
				}
			});

			// Restore volume from localStorage
			const saved = localStorage.getItem('ms2-player-volume');
			if (saved) {
				this.volume = Number(saved);
				this.audio.volume = this.volume;
			}
		}
	}

	private startTimeTracking() {
		if (!browser) return;
		const update = () => {
			if (this.audio) {
				this.currentTime = this.audio.currentTime;
			}
			this.animFrameId = requestAnimationFrame(update);
		};
		this.animFrameId = requestAnimationFrame(update);
	}

	private stopTimeTracking() {
		if (this.animFrameId !== null) {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = null;
		}
	}

	play(track: Track, playlist?: Track[]) {
		if (!this.audio) return;

		if (playlist) {
			this.playlist = playlist;
			this.playlistIndex = playlist.findIndex((t) => t.id === track.id);
		}

		this.currentTrack = track;
		this.audio.src = AUDIO_BASE_URL + track.fileName;
		this.audio.play();
		this.isPlaying = true;
		this.isVisible = true;
		this.startTimeTracking();
	}

	togglePlay() {
		if (!this.audio || !this.currentTrack) return;

		if (this.isPlaying) {
			this.audio.pause();
			this.isPlaying = false;
			this.stopTimeTracking();
		} else {
			this.audio.play();
			this.isPlaying = true;
			this.startTimeTracking();
		}
	}

	next() {
		if (this.playlist.length === 0) return;
		let nextIndex: number;
		if (this.shuffle) {
			nextIndex = Math.floor(Math.random() * this.playlist.length);
		} else {
			nextIndex = (this.playlistIndex + 1) % this.playlist.length;
		}
		this.playlistIndex = nextIndex;
		this.play(this.playlist[nextIndex]);
	}

	toggleShuffle() {
		this.shuffle = !this.shuffle;
	}

	toggleLoop() {
		this.loop = !this.loop;
	}

	prev() {
		if (this.playlist.length === 0) return;
		// If more than 3 seconds in, restart current track
		if (this.currentTime > 3) {
			this.seek(0);
			return;
		}
		const prevIndex = (this.playlistIndex - 1 + this.playlist.length) % this.playlist.length;
		this.playlistIndex = prevIndex;
		this.play(this.playlist[prevIndex]);
	}

	seek(time: number) {
		if (!this.audio) return;
		this.audio.currentTime = time;
		this.currentTime = time;
	}

	setVolume(vol: number) {
		this.volume = Math.max(0, Math.min(1, vol));
		if (this.audio) {
			this.audio.volume = this.volume;
		}
		if (browser) {
			localStorage.setItem('ms2-player-volume', String(this.volume));
		}
	}

	close() {
		if (this.audio) {
			this.audio.pause();
			this.audio.src = '';
		}
		this.isPlaying = false;
		this.isVisible = false;
		this.currentTrack = null;
		this.currentTime = 0;
		this.duration = 0;
		this.stopTimeTracking();
	}
}

export const musicPlayer = new MusicPlayerState();
