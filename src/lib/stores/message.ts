import { writable } from 'svelte/store';

export interface MessageState {
	text: string;
	type?: 'info' | 'success' | 'error' | 'warning';
	duration?: number;
}

let timeoutId: ReturnType<typeof setTimeout> | null = null;

function createMessageStore() {
	const { subscribe, set } = writable<MessageState>({ text: '', type: 'info' });

	return {
		subscribe,
		show: (text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', duration: number = 3000) => {
			// Clear any existing timeout
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}

			set({ text, type, duration });

			// Auto-dismiss after duration
			if (duration > 0) {
				timeoutId = setTimeout(() => {
					set({ text: '', type: 'info' });
					timeoutId = null;
				}, duration);
			}
		},
		clear: () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			set({ text: '', type: 'info' });
		}
	};
}

export const messageStore = createMessageStore();
